import { Entity, Storage } from '@aromix/core'
import * as v from 'valibot'

declare const kvStorage: Storage.KV

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

  access(can) {
    can.read(['id', 'title', 'body', 'author', 'createdAt'])
    can.write(['title', 'body', 'status'])
    can.read.omit(['internal', 'internal.sourceIp', 'author.name'])
  },
})
