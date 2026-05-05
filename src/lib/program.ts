import { CommandCtx } from "./context";
import { Hook } from "./hooks";
import { Service } from "./service";

export interface ProgramConfig {
  name: string;
  services?: Record<PropertyKey, Service>;
  hooks?: Hook[];
}

interface RouteEntry {
  name: string;
  hooks: Hook[];
  handler: (ctx: any) => unknown;
}

interface ProgramMeta {
  config: ProgramConfig;
  commands: RouteEntry[];
}


export interface Program {
  command(name: string, handler: (ctx: CommandCtx) => unknown): void;
  command(
    name: string,
    hooks: Hook[],
    handler: (ctx: CommandCtx) => unknown,
  ): void;

  /** @internal */
  meta: ProgramMeta
}

export function program(config: ProgramConfig): Program {

  const meta: ProgramMeta = {
    config: {
      name: config.name,
      services: config.services ?? {},
      hooks: config.hooks ?? [],
    },
    commands: [],
  };


  const resolve = (hookOrHandler: Hook[] | RouteEntry['handler'], handler?: RouteEntry['handler']) => {
    if (Array.isArray(hookOrHandler)) {
      return { hooks: hookOrHandler, handler: handler! }
    } else {
      return { hooks: [], handler: hookOrHandler }
    }
  }



  return {
    meta,
    command(name: string, hookOrHandler: any, handler?: any) {
      meta.commands.push({
        name,
        ...resolve(hookOrHandler, handler)
      })
    },
  };
}
