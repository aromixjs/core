import { Entity, Storage } from '@aromix/core'
import { FileKv } from '../storage/file-kv'
import { postSchema } from './post-entity'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/posts')

async function setup() {
      await mkdir(dataDirectory, { recursive: true })

      const fileKv = new FileKv(dataDirectory)
      const kvStorage = Storage.KvAdapter(fileKv)

      return { fileKv, kvStorage }
}

async function main() {
      const { kvStorage } = await setup()

      const posts = Entity.kv({
            name: 'post',
            storage: kvStorage,
            model: postSchema,
      })

      const key = 'post-1'

      await posts.set(key, {
            id: key,
            title: 'Hello World',
            body: 'This is the first post',
            status: 'published',
            author: {
                  id: 'user-1',
                  name: 'Alice',
            },
      })

      console.log('created -> ' + join(dataDirectory, key + '.json'))

      const loaded = await posts.get(key)
      console.log('')
      console.log('loaded:', JSON.stringify(loaded, null, 2))
      console.log('')
      console.log('title:', loaded.title)

      await posts.set(key, {
            ...loaded,
            title: 'Hello World Updated',
      })

      const updated = await posts.get(key)
      console.log('updated title:', updated.title)
      console.log('')
      console.log('file saved at -> ' + join(dataDirectory, key + '.json'))

      console.log('')
      console.log('read access:', posts[Entity.$meta].readAccess)
      console.log('write access:', posts[Entity.$meta].writeAccess)
}

main().catch(console.error)
