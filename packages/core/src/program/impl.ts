import { Program, programMeta, ProgramMeta } from "./types";
import { resolve } from "./util";




export function program(programConfig: Program[ProgramMeta]['programConfig']
): Program {

  const meta: Program[ProgramMeta] = {
    programConfig,
    routes: [],
  };

  return {

    [programMeta]: meta,

    command(name: string, hookOrHandler: any, handler?: any) {
      meta.routes.push({ type: 'command', name, ...resolve(hookOrHandler, handler) });
    },

    stream(name: string, hookOrHandler: any, handler?: any) {
      meta.routes.push({ type: 'stream', name, ...resolve(hookOrHandler, handler) });
    },

    socket(name: string, hookOrHandler: any, handler?: any) {
      meta.routes.push({ type: 'socket', name, ...resolve(hookOrHandler, handler) });
    },
  };
}
