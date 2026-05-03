import { CommandCtx, SocketCtx, StreamCtx } from "./context";

type Next = () => Promise<void>;
type Middleware<TCtx> = (ctx: TCtx, next: Next) => Promise<void> | void;



export interface ProgramConfig {
  name: string;
  services?: any[];
  hooks?: any[];
}

interface Program {
  command(name: string, handler: (ctx: CommandCtx) => unknown): void;
  command(name: string, middleware: Middleware<CommandCtx>[], handler: (ctx: CommandCtx) => unknown): void;

  stream(name: string, handler: (ctx: StreamCtx) => unknown): void;
  stream(name: string, middleware: Middleware<StreamCtx>[], handler: (ctx: StreamCtx) => unknown): void;

  socket(name: string, handler: (ctx: SocketCtx) => void): void;
  socket(name: string, middleware: Middleware<SocketCtx>[], handler: (ctx: SocketCtx) => void): void;
}

export function program(config: ProgramConfig): Program {
  return {
    command(name: string, middlewareOrHandler: any, handler?: any) {},
    stream(name: string, middlewareOrHandler: any, handler?: any) {},
    socket(name: string, middlewareOrHandler: any, handler?: any) {},
  };
}