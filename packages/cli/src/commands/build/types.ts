import type { TsConfigJson } from "get-tsconfig";
import type esbuild from "esbuild";

export interface ResolvedBuildOptions {
	entry: string;
	outDir: string;
	platform: esbuild.Platform;
	sourcemap: boolean;
	minify: boolean;
	tsConfigPath: string;
	tsConfigDir: string;
	tsConfig: TsConfigJson;
}