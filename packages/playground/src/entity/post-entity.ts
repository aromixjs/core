import * as v from 'valibot'

export const postSchema = v.object({
  id: v.string(),
  title: v.string(),
  body: v.string(),
  status: v.optional(v.string(), 'draft'),

  author: v.object({
    id: v.string(),
    name: v.string(),
  }),
})
