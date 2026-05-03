import { CommandCtx, SocketCtx, StreamCtx } from "./context";
import { Hook } from "./hooks";
import { Service } from "./service";

export interface ProgramConfig {
  name: string;
  services?: Service[];
  hooks?: Hook[];
}

interface Program {
  command(name: string, handler: (ctx: CommandCtx) => unknown): void;
  command(
    name: string,
    hooks: Hook[],
    handler: (ctx: CommandCtx) => unknown,
  ): void;

  stream(name: string, handler: (ctx: StreamCtx) => unknown): void;
  stream(
    name: string,
    hooks: Hook[],
    handler: (ctx: StreamCtx) => unknown,
  ): void;

  socket(name: string, handler: (ctx: SocketCtx) => void): void;
  socket(name: string, hooks: Hook[], handler: (ctx: SocketCtx) => void): void;
}




export function program(config: string | ProgramConfig): Program {
  return {
    command(name: string, hookOrHandler: any, handler?: any) { },
    stream(name: string, hookOrHandler: any, handler?: any) { },
    socket(name: string, hookOrHandler: any, handler?: any) { },
  };
}
