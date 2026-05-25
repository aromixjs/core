import { entity, Storage } from "@aromix/core";
import * as v from "valibot";
declare module '@aromix/core' {
  interface AromixRoles {
    public: true
    admin:  true
  }
}

declare const kvStorage: Storage.KV

entity({
  name:    'post',
  storage: kvStorage,
  guards:  [],
  effects: [],

  model: v.object({
    id:        v.string(),
    title:     v.string(),
    body:      v.string(),
    status:    v.optional(v.string(), 'draft'),
    createdAt: v.optional(v.date(), () => new Date()),

    author: v.object({
      id:     v.string(),
      name:   v.string(),
      avatar: v.optional(v.string()),
    }),

    internal: v.object({
      flagged:  v.optional(v.boolean(), false),
      sourceIp: v.optional(v.string()),
    }),
  }),

}).access({

  public(fields, can) {
    can.read(['id', 'title', 'body', 'author', 'createdAt'])
  },

  admin(fields, can) {
    can.read(['id', 'title', 'body', 'author', 'status', 'createdAt', 'internal'])
    can.write(['title', 'body', 'status'])
  },

})



