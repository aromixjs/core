import { Hook } from "./hooks";
import { HttpMethod, Plugin, PluginContext, RouteHandler } from "./plugin";

export interface MakeOptions {
  hooks?: Hook[];
  plugins?: Plugin[];
}

export interface AromixDescriptor {
  appStartHooks: Extract<Hook, { event: "app:start" }>[];
  appStopHooks: Extract<Hook, { event: "app:stop" }>[];
  errorHooks: Extract<Hook, { event: "error" }>[];
  routes: RouteEntry[];
}

export interface RouteEntry {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
}

export function make(options: MakeOptions = {}): AromixDescriptor {
  const descriptor: AromixDescriptor = {
    appStartHooks: [],
    appStopHooks: [],
    errorHooks: [],
    routes: [],
  };

  for (const h of options.hooks ?? []) {
    if (h.event === "app:start") descriptor.appStartHooks.push(h);
    if (h.event === "app:stop") descriptor.appStopHooks.push(h);
    if (h.event === "error") descriptor.errorHooks.push(h);
  }

  const ctx: PluginContext = {
    onStart: (run) => descriptor.appStartHooks.push({ event: "app:start", run }),
    onStop: (run) => descriptor.appStopHooks.push({ event: "app:stop", run }),
    addRoute: (method, path, handler) => descriptor.routes.push({ method, path, handler }),
  };

  for (const plugin of options.plugins ?? []) {
    plugin.install(ctx);
  }

  return descriptor;
}
