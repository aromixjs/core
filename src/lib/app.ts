import { register, Token } from "./di";
import { Hook } from "./hooks";
import { RouteHandler, Router, RouteValue } from "./router";

export class App {
  private readonly routeRegistry = new Map<string, RouteValue>();
  private readonly hooks = new Set<Hook>();

  router(instance: Router) {
    for (const [path, value] of instance.getRegistry()) {
      this.routeRegistry.set(path, value);
    }
  }

  provide<T>(token: Token<T>, value: T) {
    register(token, value);
  }

  hook(ref: Hook) {
    this.hooks.add(ref);
  }

  async listen(port: number, cb?: (server: Bun.Server<undefined>) => void) {
    const routes: Record<string, RouteHandler> = {};

    for (const [path, value] of this.routeRegistry) {
      const base: RouteHandler =
        typeof value === "string"
          ? () =>
              new Response(value, { headers: { "Content-Type": "text/html" } })
          : value;

      routes[path] = this.wrap(base);
    }

    const server = Bun.serve({
      port,
      routes,
      fetch: this.wrap(() => new Response("Not Found", { status: 404 })),
    });

    for (const hook of this.hooksOf("Ready")) {
      await hook.run();
    }

    cb?.(server);
  }

  private hooksOf<T extends Hook["on"]>(on: T) {
    return [...this.hooks].filter(
      (hook): hook is Extract<Hook, { on: T }> => hook.on === on,
    );
  }

  private wrap(handler: RouteHandler): RouteHandler {
    return async (req: Request) => {
      try {
        for (const hook of this.hooksOf("Request")) {
          const early = await hook.run(req);
          if (early) return early;
        }

        let res = await handler(req);

        for (const hook of this.hooksOf("Response")) {
          res = (await hook.run(req, res)) ?? res;
        }

        return res;
      } catch (err) {
        for (const hook of this.hooksOf("Error")) {
          const errRes = await hook.run(err, req);
          if (errRes) return errRes;
        }
        return new Response("Internal Server Error", { status: 500 });
      }
    };
  }
}
export function createApp() {
  return new App();
}
