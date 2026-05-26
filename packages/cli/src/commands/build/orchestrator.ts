import { type BuildConfig, type Platform } from '@aromix/core'
import esbuild from 'esbuild'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { Config } from './config'

export class Build {
      readonly root = process.cwd()

      readonly PlatformMap: Record<Platform, esbuild.Platform> = {
            node: 'node',
            bun: 'node',
            'cloudflare:worker': 'neutral',
      }

      async run() {
            const config = new Config(this.root)
            const buildConfig = await config.buildConfig()
            const opts = this.resolveOptions(buildConfig)

            await esbuild.build({
                  entryPoints: [opts.entry],
                  outfile: opts.outfile,
                  format: 'esm',
                  platform: opts.platform,
                  sourcemap: opts.sourcemap,
                  minify: opts.minify,
                  tsconfig: opts.tsConfigPath,
            })

            await this.copyAssets(dirname(opts.entry), opts.outDir)
            console.log('Done.')
      }

      private resolveOptions(config: BuildConfig) {
            const entry = resolve(this.root, config.entry)
            if (!existsSync(entry)) {
                  throw new Error(`Entry point not found: ${entry}`)
            }

            const tsConfigPath = resolve(this.root, config.tsConfig)
            if (!existsSync(tsConfigPath)) {
                  throw new Error(`tsconfig not found: ${tsConfigPath}`)
            }

            return {
                  entry,
                  outfile: resolve(this.root, config.outDir, basename(entry).replace(/\.ts$/, '.js')),
                  outDir: resolve(this.root, config.outDir),
                  platform: this.PlatformMap[config.platform],
                  sourcemap: config.sourcemap,
                  minify: config.minify,
                  tsConfigPath,
            }
      }

      private async copyAssets(srcDir: string, outDir: string): Promise<void> {
            const entries = await readdir(srcDir, { withFileTypes: true })

            await Promise.all(
                  entries.map(async (entry) => {
                        const src = join(srcDir, entry.name)
                        const dest = join(outDir, entry.name)

                        if (entry.isDirectory()) {
                              await this.copyAssets(src, dest)
                        } else if (!/\.(ts|js)$/.test(entry.name)) {
                              await mkdir(dirname(dest), { recursive: true })
                              await copyFile(src, dest)
                        }
                  }),
            )
      }
}
