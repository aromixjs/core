import type esbuild from 'esbuild'
import type { TsConfigJson } from 'get-tsconfig'

export interface ResolvedBuildOptions {
      entry: string
      outDir: string
      platform: esbuild.Platform
      sourcemap: boolean
      minify: boolean
      tsConfigPath: string
      tsConfigDir: string
      tsConfig: TsConfigJson
}
