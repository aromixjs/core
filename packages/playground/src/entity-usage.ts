import { Adapter, Entity } from '@aromix/core'
import * as v from 'valibot'

declare const kvStorage: Adapter.KV

Entity.kv({
      name: 'post',
      storage: kvStorage,
      guards: [],
      effects: [],

      model: v.object({
            id: v.string(),
            title: v.string(),
            body: v.string(),
            status: v.optional(v.string(), 'draft'),
            createdAt: v.optional(v.date(), () => new Date()),

            author: v.object({
                  id: v.string(),
                  name: v.string(),
                  avatar: v.optional(v.string()),
            }),

            internal: v.object({
                  flagged: v.optional(v.boolean(), false),
                  sourceIp: v.optional(v.string()),
            }),
      }),
})
