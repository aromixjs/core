export interface ResolvedBuildOptions {
      entry: string
      outfile: string
      platform: import('esbuild').Platform
      sourcemap: boolean
      minify: boolean
      tsConfigPath: string
}
