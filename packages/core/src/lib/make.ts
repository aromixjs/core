import { action } from "./action";
import { group } from "./group";
import { Middleware } from "./middleware";
import { RawContext, ReplyValue } from "./request";

export interface MakeOptions {
  groups: Array<new () => any>;
  plugins?: Array<any>;
  middlewares?: Middleware[];
}

export interface DispatchEntry {
  chain: readonly Middleware[];
  handler: (ctx: RawContext) => Promise<ReplyValue>;
}

export interface AromixDescriptor {
  handlers: Map<string, DispatchEntry>;
}

export function make(options: MakeOptions) {
  const descriptor: AromixDescriptor = {
    handlers: new Map(),
  };

  const globalMiddlewares = options.middlewares ?? [];

  for (const gp of options.groups) {
    const instance = new gp();
    const groupMeta = group.getMeta(instance);
    const actionMap = action.getMeta(instance);

    if (!groupMeta || !actionMap) continue;

    for (const [methodKey, actionMeta] of Object.entries(actionMap)) {
      const fullKey = `${groupMeta.prefix}:${actionMeta.prefix}`;

      const chain: Middleware[] = [
        ...globalMiddlewares,
        ...groupMeta.middlewares,
        ...actionMeta.middlewares,
      ];

      descriptor.handlers.set(fullKey, {
        chain,
        handler: (ctx: RawContext) =>
          (instance[methodKey] as Function).call(instance, ctx),
      });
    }
  }

  return descriptor;
}
