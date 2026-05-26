import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { Adapter } from '@aromix/core'

export class FileKv implements Adapter.KV {
  private readonly directory: string

  constructor(directory: string) {
    this.directory = directory
  }

  async get(key: string): Promise<unknown> {
    try {
      const data = await readFile(this.pathFor(key), 'utf-8')

      return JSON.parse(data)
    } catch (error) {
      if (isNotFoundError(error)) {
        return null
      }

      throw error
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    await mkdir(this.directory, { recursive: true })

    await writeFile(this.pathFor(key), JSON.stringify(value, null, 2), 'utf-8')
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.pathFor(key))
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      await access(this.pathFor(key))

      return true
    } catch {
      return false
    }
  }

  private pathFor(key: string): string {
    return join(this.directory, `${key}.json`)
  }
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
