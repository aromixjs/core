import { Adapter, Entity } from '@aromix/core'
import { ax } from '@aromix/validator'

declare const FileKv: any
declare const dataDirectory: string

const fileKv = new FileKv(dataDirectory)
const kvStorage = Adapter.kv(fileKv)

Entity.kv({
      name: 'session',
      storage: kvStorage,
      model: ax.object({
            id: ax.string(),
            title: ax.string(),
            body: ax.string(),
            status: ax.union([ax.string(), ax.undefined()]).default('draft'),
            author: ax.object({
                  id: ax.string(),
                  name: ax.string(),
            }),
      }),
})
