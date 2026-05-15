import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { TsConfig } from "./types";
import { AromixBuildConfig } from "@aromix/core";
import esbuild from "esbuild";
import { tmpdir } from "node:os";

export class Config {
	constructor(private root: string) {}

	readonly ConfigFileName = ["aromix.build.ts", "aromix.build.js", "aromix.build.mjs"] as const;

	async buildConfig(): Promise<AromixBuildConfig> {
		const configPath = this.ConfigFileName.map((file) => join(this.root, file)).find(existsSync);

		if (!configPath) {
			throw new Error(`No aromix.build.ts found in ${this.root}`);
		}

		// Bundle to a temp .mjs then dynamic import() it.
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
			console.log(`Loaded config from ${relative(this.root, configPath)}`);
			return mod.default as AromixBuildConfig;
		} finally {
			if (existsSync(tmp)) unlinkSync(tmp);
		}
	}

	tsConfig(filePath: string): TsConfig {
		const tsConfigPath = join(this.root, filePath);

		if (!existsSync(tsConfigPath)) {
			throw new Error(`tsconfig not found: ${tsConfigPath}`);
		}

		const raw = readFileSync(tsConfigPath, "utf8");
		// strip ts-style comments
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

		const paths: Record<string, string[]> = {};
		for (const [alias, targets] of Object.entries(compilerOptions.paths ?? {})) {
			paths[alias] = (targets as string[]).map((t) => resolve(baseUrl, t));
		}

		return { outDir, baseUrl, paths };
	}
}
