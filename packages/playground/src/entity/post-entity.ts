import { ax } from '@aromix/validator'

export const postSchema = ax.object({
      id: ax.string(),
      title: ax.string(),
      body: ax.string(),
      status: ax.union([ax.string(), ax.undefined()]).default('draft'),
      author: ax.object({
            id: ax.string(),
            name: ax.string(),
            avatar: ax.union([ax.string(), ax.undefined()]),
      }),
})
