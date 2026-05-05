import { CommandCtx } from "../context";
import { Hook } from "../hooks";
import { Service } from "../service";



export type CommandHandler = (ctx: CommandCtx) => any | Promise<any>

export interface Program {
   /** @internal */
   meta: {
      programConfig: {
         name: string;
         services?: Record<PropertyKey, Service>;
         hooks?: Hook[];
      };
      commands: Array<{
         name: string;
         hooks: Hook[];
         handler: CommandHandler
      }>;
   };

   command(name: string, handler: CommandHandler): void;
   command(name: string, hooks: Hook[], handler: CommandHandler): void;
}