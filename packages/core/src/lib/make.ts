import { action } from "./action";
import { group } from "./group";
import { Middleware } from "./middleware";
import { ResponseBuilder } from "./response";

export interface MakeOptions {
  groups: Array<new () => any>;
  plugins?: Array<any>;
  middlewares?: Middleware[];
}

export interface DispatchEntry {
  chain: readonly Middleware[];
  handler: () => Promise<ResponseBuilder>;
}

export interface AromixDescriptor {
  handlers: Map<string, DispatchEntry>;
}

export function make(options: MakeOptions): AromixDescriptor {
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
        handler: () => (instance[methodKey] as Function).call(instance),
      });
    }
  }

  return descriptor;
}
