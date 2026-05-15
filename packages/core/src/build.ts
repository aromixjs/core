export type Platform = "node" | "bun" | "cloudflare:worker";
export type Format = "esm" | "cjs";

export interface AromixBuildConfig {
  entry: string;
  outDir: string;
  platform: Platform;
  format: Format;
  tsconfig: string;
  sourcemap: boolean;
  minify: boolean;
}

/** Identity fn :: exists purely for autocomplete and type safety */
export function build(options: AromixBuildConfig): AromixBuildConfig {
  return options;
}
