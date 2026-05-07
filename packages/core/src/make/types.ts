import { Hook } from "../hook";
import { CommandHandler, Program } from "../program/types";
import { Service } from "../service";

export interface MakeConfig {
   programs?: Array<Program>,
   hooks?: Array<Hook>,
   services?: Record<PropertyKey, Service>
}


export interface ResolvedApp {
   routes: Map<string, {
      key: string;
      handler: CommandHandler
      services: Record<PropertyKey, Service>;
      onRequest: Extract<Hook, { on: "Request" }>["run"][];
      onResponse: Extract<Hook, { on: "Response" }>["run"][];
      onError: Extract<Hook, { on: "Error" }>["run"][];
   }>;
   onReady: Extract<Hook, { on: "Ready" }>["run"][];
   onClose: Extract<Hook, { on: "Close" }>["run"][];
}