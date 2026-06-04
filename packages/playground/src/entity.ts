import { guard } from 'valibot'

const fileKv = new FileKv(dataDirectory)
const kvStorage = Storage.KvAdapter(fileKv)

const user = Entity.kv({
      name: 'session',
      storage: kvStorage,
      model: v.object({
            id: v.string(),
            title: v.string(),
            body: v.string(),
            status: v.optional(v.string(), 'draft'),
            author: v.object({
                  id: v.string(),
                  name: v.string(),
            }),
      }),
})
