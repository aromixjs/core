import { CommandCtx, EventMap, SocketCtx, StreamCtx } from "../context";
import { Hook } from "../hook";

export const programMeta = Symbol('aromix.program.meta');
export type ProgramMeta = typeof programMeta;

export type CommandHandler = (ctx: CommandCtx) => unknown | Promise<unknown>;
export type Push<T = unknown> = (data: T) => void;
export type Done = () => void;
export type Emitter<T = unknown> = (push: Push<T>, done: Done) => void | Promise<void>;

export type StreamHandler = (ctx: StreamCtx) => Emitter;


export type SocketHandler<
   Receive extends EventMap = EventMap,
   Send extends EventMap = EventMap,
> = (ctx: SocketCtx<Receive, Send>) => void;



export type Route =
   | { type: 'command'; name: string; hooks: Hook[]; handler: CommandHandler }
   | { type: 'stream'; name: string; hooks: Hook[]; handler: StreamHandler }
   | { type: 'socket'; name: string; hooks: Hook[]; handler: SocketHandler };


export interface Program {
   [programMeta]: {
      programConfig: {
         name: string;
         hooks?: Hook[];
      };
      routes: Route[];
   };

   command(name: string, handler: CommandHandler): void;
   command(name: string, hooks: Hook[], handler: CommandHandler): void;

   stream(name: string, handler: StreamHandler): void;
   stream(name: string, hooks: Hook[], handler: StreamHandler): void;

   socket<Recv extends EventMap, Send extends EventMap>(
      name: string,
      handler: SocketHandler<Recv, Send>
   ): void;
   socket<Recv extends EventMap, Send extends EventMap>(
      name: string,
      hooks: Hook[],
      handler: SocketHandler<Recv, Send>
   ): void;

}