import { Config, toFetchHandler } from '@aromix/core'

declare module '@aromix/core' {
      interface Config {
            server: { port: number; host: string }
      }
}

export async function serve() {
      // const { onReady } = app;
      // const { port, host } = config.server;
      // for (const fn of onReady) await fn(config);
      // const handler = toFetchHandler(app);
      // const server = Bun.serve({
      //    port,
      //    hostname: host,
      //    fetch: handler
      // });
      // return server
}
