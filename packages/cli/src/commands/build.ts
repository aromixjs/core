import { existsSync, lstatSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import esbuild from "esbuild";
import { tmpdir } from "node:os";
import { AromixBuildConfig, config } from "@aromix/core";

interface TsConfig {
	outDir: string;
	baseUrl: string;
	paths: Record<string, string[]>;
}

interface ResolvedOptions {
	entry: string[];
	outDir: string;
	platform: esbuild.Platform;
	formats: esbuild.Format[];
	sourcemap: boolean;
	minify: boolean;
}

export class Build {
	private root = process.cwd();

	private readonly ConfigFileNames = ["aromix.build.ts", "aromix.build.js", "aromix.build.mjs"];

	private readonly PlatformMap: Record<AromixBuildConfig["platform"], esbuild.Platform> = {
		node: "node",
		bun: "node",
		deno: "neutral",
		edge: "neutral",
	};

	private readonly FormatMap: Record<AromixBuildConfig["format"][number], esbuild.Format> = {
		esm: "esm",
		cjs: "cjs",
	};

	private async loadBuildConfig(): Promise<AromixBuildConfig> {
		const configPath = this.ConfigFileNames.map((file) => join(this.root, file)).find(existsSync);

		if (!configPath) {
			throw new Error(`No aromix.build.ts found in ${this.root}`);
		}

		// Bundle the config file to a temp .mjs so we can dynamic import() it.
		// esbuild is already a dep — same trick Vite uses internally.
		const tmp = join(tmpdir(), `aromix.build.${Date.now()}.mjs`);

		try {
			await esbuild.build({
				entryPoints: [configPath],
				outfile: tmp,
				bundle: true,
				format: "esm",
				platform: "node",
				packages: "external",
				write: true,
			});

			const mod = await import(tmp);
			const config = mod.default as AromixBuildConfig;
			console.log(`Loaded config from ${relative(this.root, configPath)}`);
			return config;
		} finally {
			if (existsSync(tmp)) unlinkSync(tmp);
		}
	}

	private readTsConfig(tsConfigFile: string): TsConfig {
		const tsConfigPath = join(this.root, tsConfigFile);

		if (!existsSync(tsConfigPath)) {
			throw new Error(`tsconfig not found: ${tsConfigPath}`);
		}

		const raw = readFileSync(tsConfigPath, "utf8");
		const cleaned = raw.replace(/\/\/[^\n]*/g, "");

		const { compilerOptions = {} } = JSON.parse(cleaned);

		let baseUrl = this.root;
		if (compilerOptions.baseUrl) {
			baseUrl = resolve(this.root, compilerOptions.baseUrl);
		}

		let outDir = join(this.root, "dist");
		if (compilerOptions.outDir) {
			outDir = resolve(this.root, compilerOptions.outDir);
		}

		const paths: Record<PropertyKey, string[]> = {};

		for (const [alias, targets] of Object.entries(compilerOptions.paths ?? {})) {
			paths[alias] = (targets as string[]).map((target) => resolve(baseUrl, target));
		}

		return {
			outDir,
			paths,
			baseUrl,
		};
	}

	private resolveOptions(config: AromixBuildConfig, tsConfig: TsConfig): ResolvedOptions {
		const entry = config.entry.map((e) => resolve(this.root, e));

		for (const e of entry) {
			if (!existsSync(e)) throw new Error(`Entry point not found: ${e}`);
		}

		return {
			entry,
			outDir: config.outDir ? resolve(this.root, config.outDir) : tsConfig.outDir,
			platform: this.PlatformMap[config.platform],
			formats: config.format.map((f) => this.FormatMap[f]),
			sourcemap: config.sourcemap,
			minify: config.minify,
		};
	}

	async index() {
		const config = await this.loadBuildConfig();
		const tsConfig = this.readTsConfig(config.tsconfig);
		const options = this.resolveOptions(config, tsConfig);
	}

	private makeLoadPlugin(tsConfig: TsConfig): esbuild.Plugin {
		return {
			name: "Aromix:Load",
			setup: (build) => {
				build.onLoad({ filter: /\.[tj]sx?$/ }, (args) => {
					const src = readFileSync(args.path, "utf8");
					if (!src.includes("load(")) return undefined;

					return {
						contents: this.rewriteLoadCalls(src, args.path, tsConfig),
						loader: this.inferLoader(args.path),
					};
				});
			},
		};
	}

	private rewriteLoadCalls(src: string, filePath: string, tsConfig: TsConfig): string {
		const LOAD_RE = /\bload\((\s*(?:'[^']*'|"[^"]*"|\[[^\]]*\])\s*)\)/g;

		return src.replace(LOAD_RE, (_match, rawArg: string) => {
			const trimmed = rawArg.trim();
			const patterns = trimmed.startsWith("[")
				? [...trimmed.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
				: [trimmed.slice(1, -1)];

			const resolved = patterns
				.flatMap((p) => this.resolveLoadPattern(p, tsConfig, dirname(filePath)))
				.map((p) => p.split(sep).join("/"));

			return JSON.stringify(resolved);
		});
	}

	private resolveLoadPattern(pattern: string, tsConfig: TsConfig, fromDir: string): string[] {
		let concrete = [pattern];

		for (const [alias, targets] of Object.entries(tsConfig.paths)) {
			const rx = new RegExp("^" + alias.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "(.*)") + "$");
			const m = pattern.match(rx);
			if (!m) continue;
			const capture = m[1] ?? "";
			concrete = targets.map((t) => (t.includes("*") ? t.replace("*", capture) : t));
			break;
		}

		const seen = new Set<string>();
		for (const p of concrete.flatMap((p) => this.expandBraces(p))) {
			for (const match of this.resolveGlob(p, fromDir)) seen.add(match);
		}
		return [...seen];
	}

	private expandBraces(pattern: string): string[] {
		const open = pattern.indexOf("{");
		if (open === -1) return [pattern];

		let depth = 0,
			close = -1;
		for (let i = open; i < pattern.length; i++) {
			if (pattern[i] === "{") depth++;
			else if (pattern[i] === "}") {
				if (--depth === 0) {
					close = i;
					break;
				}
			}
		}
		if (close === -1) return [pattern];

		const prefix = pattern.slice(0, open);
		const suffix = pattern.slice(close + 1);
		const parts: string[] = [];
		let buf = "",
			d = 0;

		for (const ch of pattern.slice(open + 1, close)) {
			if (ch === "{") {
				d++;
				buf += ch;
			} else if (ch === "}") {
				d--;
				buf += ch;
			} else if (ch === "," && d === 0) {
				parts.push(buf);
				buf = "";
			} else buf += ch;
		}
		parts.push(buf);

		return parts.flatMap((p) => this.expandBraces(prefix + p + suffix));
	}

	private resolveGlob(pattern: string, cwd: string): string[] {
		const parts = pattern.split(/[/\\]/);
		const staticParts: string[] = [];
		const globParts: string[] = [];
		let inGlob = false;

		for (const p of parts) {
			if (!inGlob && !/[*?{]/.test(p)) staticParts.push(p);
			else {
				inGlob = true;
				globParts.push(p);
			}
		}

		const baseDir = resolve(cwd, staticParts.join("/"));
		if (!globParts.length) return existsSync(baseDir) ? [baseDir] : [];
		return this.walkGlob(baseDir, globParts);
	}

	private walkGlob(dir: string, segments: string[]): string[] {
		if (!segments.length) return [];
		const [head, ...rest] = segments;
		const isLast = rest.length === 0;
		const regex = new RegExp("^" + head.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$");

		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			return [];
		}

		const results: string[] = [];
		for (const name of entries) {
			if (!regex.test(name)) continue;
			const full = join(dir, name);
			const stat = lstatSync(full);
			if (isLast && stat.isFile()) results.push(full);
			else if (!isLast && stat.isDirectory()) results.push(...this.walkGlob(full, rest));
		}
		return results;
	}

	private inferLoader(filePath: string): esbuild.Loader {
		if (filePath.endsWith(".tsx")) return "tsx";
		if (filePath.endsWith(".ts")) return "ts";
		if (filePath.endsWith(".jsx")) return "jsx";
		return "js";
	}
}
