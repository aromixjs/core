export type RouteHandler = (req: Request) => Response | Promise<Response>;
export type RouteValue = string | RouteHandler;

class RouteBuilder {
  constructor(
    private readonly path: string,
    private readonly registry: Map<string, RouteValue>,
  ) {}

  render(html: string) {
    this.registry.set(this.path, html);
  }

  handle(cb: RouteHandler) {
    this.registry.set(this.path, cb);
  }
}

export class Router {
  private readonly registry = new Map<string, RouteValue>();

  /** Start building a route for the given path. */
  on(path: string): RouteBuilder {
    return new RouteBuilder(path, this.registry);
  }

  /** Read-only view of the registered routes (used by App#router). */
  getRegistry(): ReadonlyMap<string, RouteValue> {
    return this.registry;
  }
}

export function createRouter() {
  return new Router();
}
