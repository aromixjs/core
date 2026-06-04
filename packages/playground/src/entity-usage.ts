import { Adapter, Entity } from '@aromix/core'
import { ax } from '@aromix/validator'

declare const kvStorage: Adapter.KV

Entity.kv({
      name: 'post',
      storage: kvStorage,
      guards: [],
      effects: [],

      model: ax.object({
            id: ax.string(),
            title: ax.string(),
            body: ax.string(),
            status: ax.union([ax.string(), ax.undefined()]).default('draft'),
            createdAt: ax.union([ax.string(), ax.undefined()]).defaultFn(() => new Date().toISOString()),

            author: ax.object({
                  id: ax.string(),
                  name: ax.string(),
                  avatar: ax.union([ax.string(), ax.undefined()]),
            }),

            internal: ax.object({
                  flagged: ax.union([ax.boolean(), ax.undefined()]).default(false),
                  sourceIp: ax.union([ax.string(), ax.undefined()]),
            }),
      }),
})
