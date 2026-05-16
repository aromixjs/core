export type Platform = "node" | "bun" | "cloudflare:worker";


export interface AromixBuildConfig {
	entry: string;
	outDir: string;
	platform: Platform;
	sourcemap: boolean;
	minify: boolean;
	tsConfig: string;
}

/** Identity fn :: exists purely for autocomplete and type safety */
export function build(options: AromixBuildConfig): AromixBuildConfig {
	return options;
}