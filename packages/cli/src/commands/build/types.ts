import type esbuild from "esbuild";

export interface TsConfig {
	outDir: string;
	baseUrl: string;
	paths: Record<string, string[]>;
}

export interface ResolvedBuildOptions {
	entry: string;
	outDir: string;
	platform: esbuild.Platform;
	format: esbuild.Format;
	sourcemap: boolean;
	minify: boolean;
}
