import { MakeConfig, ResolvedApp } from "./types";
import { filter } from "./util";


export function make(makeConfig: MakeConfig): ResolvedApp {

   const { hooks: globalHooks = [], services: globalServices = [], programs = [] } = makeConfig;

   const routes: ResolvedApp['routes'] = new Map();

   const onReady: ResolvedApp["onReady"] = [];
   const onClose: ResolvedApp["onClose"] = [];


   onReady.push(...filter(globalHooks, "Ready"));
   onClose.push(...filter(globalHooks, "Close"));


   for (const program of programs) {

      const { programConfig, commands } = program.meta;
      const programHooks = programConfig.hooks ?? [];


      onReady.push(...filter(programHooks, "Ready"));
      onClose.push(...filter(programHooks, "Close"));



      // make → program (program overrides make if same key)
      const programServices = {
         ...makeConfig.services,
         ...programConfig.services,
      };


      for (const command of commands) {
         onReady.push(...filter(command.hooks, "Ready"));
         onClose.push(...filter(command.hooks, "Close"));

         routes.set(`${programConfig.name}:${command.name}`, {
            key: `${programConfig.name}:${command.name}`,
            handler: command.handler,
            services: programServices,
            // make → program → command
            onRequest: [
               ...filter(globalHooks, "Request"),
               ...filter(programHooks, "Request"),
               ...filter(command.hooks, "Request"),
            ],
            // command → program → make
            onResponse: [
               ...filter(command.hooks, "Response"),
               ...filter(programHooks, "Response"),
               ...filter(globalHooks, "Response"),
            ],
            // command → program → make
            onError: [
               ...filter(command.hooks, "Error"),
               ...filter(programHooks, "Error"),
               ...filter(globalHooks, "Error"),
            ],
         });
      }
   }

   return {
      routes,
      onReady,
      onClose,
   };


}