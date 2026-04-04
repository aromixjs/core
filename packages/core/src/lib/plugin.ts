export interface Plugin {
  name: string;
  install: (ctx: PluginContext) => void;
}

export interface PluginContext {
  onStart: (fn: () => void | Promise<void>) => void;
  onStop: (fn: () => void | Promise<void>) => void;
  addRoute: (method: HttpMethod, path: string, handler: RouteHandler) => void;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type RouteHandler = (req: Request) => Response | Promise<Response>;
