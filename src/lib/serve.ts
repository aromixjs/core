import { ResolvedApp } from "./make/types";
import { CommandCtx } from "./context";


export interface ServeConfig {
   port: number;
   host: string;
}



export async function serve(app: ResolvedApp, config: ServeConfig) {
   const { routes, onReady, onClose } = app;
   const { port, host } = config;


   for (const fn of onReady) await fn();

   const server = Bun.serve({
      port,
      hostname: host,

      async fetch(req, server) {
         let route: ReturnType<ResolvedApp['routes']['get']>;

         try {
            const call = req.headers.get('x-amx-call');
            if (!call) {
               throw new Error('Missing call header');
            }

            route = routes.get(call.trim());
            if (!route) {
               throw new Error(`Unknown command "${call}"`);
            }


            for (const fn of route.onRequest) {
               const early = await fn(req);
               if (early instanceof Response) return early;
            }

            const payload = await req.json().catch(() => undefined);


            const ctx: CommandCtx = {
               id: crypto.randomUUID(),
               payload
            }


            const result = await route.handler(ctx);
            let res = Response.json(result);

            for (const fn of route.onResponse) {
               const override = await fn(req, res);
               if (override instanceof Response) res = override;
            }

            return res;

         } catch (err) {
            if (route) {



               for (const fn of route.onError) {
                  const res = await fn(err, req);
                  if (res instanceof Response) return res;
               }



            }



            throw err;



         }


      },
   });


}

