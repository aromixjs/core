import { Hook } from "../hook"

type AnyHandler = (...args: any[]) => any;

export function resolve<H extends AnyHandler>(hookOrHandler: Hook[] | H, handler?: H) {
   if (Array.isArray(hookOrHandler)) {
      return { hooks: hookOrHandler, handler: handler! };
   }
   return { hooks: [], handler: hookOrHandler };
}