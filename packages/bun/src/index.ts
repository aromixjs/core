import { ResolvedApp, toFetchHandler, } from "@aromix/core";
export interface ServeConfig {
   port: number;
   host: string;
}

export async function serve(app: ResolvedApp, config: ServeConfig) {
   const { onReady } = app;
   const { port, host } = config;
   for (const fn of onReady) await fn();
   const handler = toFetchHandler(app);
   const server = Bun.serve({
      port,
      hostname: host,
      fetch: handler
   });
   return server
}

