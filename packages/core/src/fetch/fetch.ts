import { Codec } from "./codec";
import { BaseCtx, CommandCtx } from "../context";
import { ResolvedApp } from "../make/types";


export function toFetchHandler(app: ResolvedApp) {
   const { routes } = app;


   async function runResponseHooks(
      route: NonNullable<ReturnType<ResolvedApp['routes']['get']>>,
      ctx: BaseCtx,
      res: Response,
   ): Promise<Response> {
      for (const fn of route.onResponse) {
         const override = await fn(ctx, res);
         if (override instanceof Response) res = override;
      }
      return res;
   }


   return async function handle(req: Request) {
      let route: ReturnType<ResolvedApp['routes']['get']>;
      let ctx: BaseCtx;


   }
}