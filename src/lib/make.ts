import { Hook } from "./hooks";
import { Program } from "./program";
import { Service } from "./service";

export interface AppMeta {
   programs: Program[];
   hooks: Hook[];
   services: Record<PropertyKey, Service>;
}

interface MakeConfig {
   programs?: Array<Program>,
   hooks?: Array<Hook>,
   services?: Record<PropertyKey, Service>
}

export interface App {
   /** @internal */
   meta: AppMeta;
}


export function make(config: MakeConfig): App {
   const meta: AppMeta = {
      programs: config.programs ?? [],
      hooks: config.hooks ?? [],
      services: config.services ?? {},
   };

   return {
      meta,
   };
}