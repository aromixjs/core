import { Hook } from "../hook"
import { CommandHandler } from "./types"

export const resolve = (hookOrHandler: Hook[] | CommandHandler, handler?: CommandHandler) => {
   if (Array.isArray(hookOrHandler)) {
      return { hooks: hookOrHandler, handler: handler! }
   } else {
      return { hooks: [], handler: hookOrHandler }
   }
}