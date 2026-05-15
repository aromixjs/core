import { type AromixBuildConfig, type Format, type Platform } from "@aromix/core";
import esbuild from "esbuild";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Config } from "./config";
import { MacroResolver } from "./macro.resolver";
import type { ResolvedBuildOptions, TsConfig } from "./types";
import { loadMacro } from "./macro/load";

export class Build {
	readonly root = process.cwd();

	readonly PlatformMap: Record<Platform, esbuild.Platform> = {
		node: "node",
		bun: "node",
		"cloudflare:worker": "neutral",
	};

	readonly FormatMap: Record<Format, esbuild.Format> = {
		esm: "esm",
		cjs: "cjs",
	};

	async run() {
		const config = new Config(this.root);
		const buildConfig = await config.buildConfig();
		const tsConfig = config.tsConfig(buildConfig.tsconfig);
		const opts = this.resolveOptions(buildConfig, tsConfig);

		const resolver = new MacroResolver({ root: this.root, buildConfig, tsConfig });
		this.registerMacros(resolver);

		console.log(
			`Building  ${relative(this.root, opts.entry)}\n` +
			`       →  ${relative(this.root, opts.outDir)}\n` +
			`  format   ${opts.format}  platform  ${opts.platform}`
		);

		await esbuild.build({
			entryPoints: [opts.entry],
			outdir: opts.outDir,
			bundle: true,
			format: opts.format,
			platform: opts.platform,
			sourcemap: opts.sourcemap,
			minify: opts.minify,
			packages: "external",
			plugins: [resolver.build()],
			outExtension: opts.format === "cjs" ? { ".js": ".cjs" } : {},
		});

		console.log("Done.");
	}

	private registerMacros(resolver: MacroResolver): void {
		resolver.register(loadMacro)
	}

	private resolveOptions(config: AromixBuildConfig, tsConfig: TsConfig): ResolvedBuildOptions {
		const entry = resolve(this.root, config.entry);
		if (!existsSync(entry)) throw new Error(`Entry point not found: ${entry}`);

		return {
			entry,
			outDir: config.outDir ? resolve(this.root, config.outDir) : tsConfig.outDir,
			platform: this.PlatformMap[config.platform],
			format: this.FormatMap[config.format],
			sourcemap: config.sourcemap,
			minify: config.minify,
		};
	}
}
