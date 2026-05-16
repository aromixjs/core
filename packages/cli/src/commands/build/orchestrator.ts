import { type AromixBuildConfig, type Platform } from "@aromix/core";
import esbuild from "esbuild";
import { dirname, join, resolve } from "node:path";
import { Config } from "./config";
import { MacroResolver } from "./macro.resolver";
import type { ResolvedBuildOptions } from "./types";
import { loadMacro } from "./macro/load";
import fg from "fast-glob";
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { getTsconfig } from "get-tsconfig";
export class Build {
	readonly root = process.cwd();

	readonly PlatformMap: Record<Platform, esbuild.Platform> = {
		node: "node",
		bun: "node",
		"cloudflare:worker": "neutral",
	};

	async run() {
		const config = new Config(this.root);
		const buildConfig = await config.buildConfig();
		const opts = this.resolveOptions(buildConfig);

		const resolver = new MacroResolver({ root: this.root, buildConfig, opts });
		resolver.register(loadMacro);

		const srcDir = dirname(opts.entry);
		const sourceFiles = await fg("**/*.{ts,tsx}", {
			cwd: srcDir,
			absolute: true,
			ignore: ["**/*.d.ts"],
		});

		await esbuild.build({
			entryPoints: sourceFiles,
			outdir: opts.outDir,
			outbase: srcDir,
			bundle: false,
			format: "esm",
			platform: opts.platform,
			sourcemap: opts.sourcemap,
			minify: opts.minify,
			tsconfig: opts.tsConfigPath,
			plugins: [resolver.build()],
		});

		await this.copyAssets(srcDir, opts.outDir);
		console.log("Done.");
	}

	private resolveOptions(config: AromixBuildConfig): ResolvedBuildOptions {
		const entry = resolve(this.root, config.entry);
		if (!existsSync(entry)) throw new Error(`Entry point not found: ${entry}`);

		const tsConfigPath = resolve(this.root, config.tsConfig);
		if (!existsSync(tsConfigPath)) throw new Error(`tsconfig not found: ${tsConfigPath}`);

		const parsed = getTsconfig(tsConfigPath);
		if (!parsed) throw new Error(`Failed to parse tsconfig: ${tsConfigPath}`);

		return {
			entry,
			outDir: resolve(this.root, config.outDir),
			platform: this.PlatformMap[config.platform],
			sourcemap: config.sourcemap,
			minify: config.minify,
			tsConfigPath,
			tsConfigDir: dirname(tsConfigPath),
			tsConfig: parsed.config,
		};
	}

	private async copyAssets(srcDir: string, outDir: string): Promise<void> {
		const files = await fg("**/*", {
			cwd: srcDir,
			absolute: false,
			onlyFiles: true,
			ignore: ["**/*.ts", "**/*.tsx"],
		});

		await Promise.all(
			files.map(async (file) => {
				const src = join(srcDir, file);
				const dest = join(outDir, file);
				await mkdir(dirname(dest), { recursive: true });
				await copyFile(src, dest);
			})
		);
	}
}
