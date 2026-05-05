import { CommandCtx } from "./context";
import { ResolvedApp } from "./make/types";


export function toFetchHandler(app: ResolvedApp) {
   const { routes } = app;

   return async function handle(req: Request): Promise<Response> {
      let route: ReturnType<ResolvedApp['routes']['get']>;

      try {
         const call = req.headers.get('x-amx-call');
         if (!call) throw new Error('Missing call header');

         route = routes.get(call.trim());
         if (!route) throw new Error(`Unknown command "${call}"`);

         for (const fn of route.onRequest) {
            const early = await fn(req);
            if (early instanceof Response) return early;
         }

         const payload = await req.json().catch(() => undefined);

         const ctx: CommandCtx = {
            id: crypto.randomUUID(),
            payload
         };

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
   };
}