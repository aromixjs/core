import { Program } from "./types";
import { resolve } from "./util";




export function program(programConfig: Program['meta']['programConfig']):Program {

  const meta: Program['meta'] = {
    programConfig,
    commands: [],
  };

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
