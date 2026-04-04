import { Hook } from "./hooks";

import { registerService, clearServiceRegistry } from "./di";
import { Plugin, PluginContext } from "./plugin";
import { AromixDescriptor, HttpMethod, RouteHandler } from "./types";

export interface MakeOptions {
  hooks?: Hook[];
  plugins?: Plugin[];
}

export function make(options: MakeOptions = {}): AromixDescriptor {
  const descriptor: AromixDescriptor = {
    appStartHooks: [],
    appStopHooks: [],
    beforeHooks: [],
    afterHooks: [],
    errorHooks: [],
    routes: [],
  };

  // Clear previous services (good for tests/hot reload)
  clearServiceRegistry();

  const pluginsToInstall: Plugin[] = [...(options.plugins ?? [])];

  const ctx: PluginContext = {
    onStart: (fn) => descriptor.appStartHooks.push({ event: "app:start", fn }),
    onStop: (fn) => descriptor.appStopHooks.push({ event: "app:stop", fn }),
    onBefore: (fn) => descriptor.beforeHooks.push({ event: "req:before", fn }),
    onAfter: (fn) => descriptor.afterHooks.push({ event: "req:after", fn }),
    onError: (fn) => descriptor.errorHooks.push({ event: "req:error", fn }),

    route: (method: HttpMethod, path: string, handler: RouteHandler, routeHooks: Hook[] = []) => {
      descriptor.routes.push({
        method,
        path,
        handler,
        hooks: routeHooks,
      });
    },

    service: (ctor, factory) => {
      registerService(ctor, factory);
    },

    use: (plugin: Plugin) => {
      pluginsToInstall.push(plugin);
    },
  };

  for (const plugin of pluginsToInstall) {
    try {
      console.log(`Installing plugin: ${plugin.name}`);
      plugin.install(ctx);
    } catch (err) {
      console.error(`Plugin "${plugin.name}" failed to install:`, err);
      throw err;
    }
  }

  for (const h of options.hooks ?? []) {
    switch (h.event) {
      case "app:start":
        descriptor.appStartHooks.push(h);
        break;
      case "app:stop":
        descriptor.appStopHooks.push(h);
        break;
      case "req:before":
        descriptor.beforeHooks.push(h);
        break;
      case "req:after":
        descriptor.afterHooks.push(h);
        break;
      case "req:error":
        descriptor.errorHooks.push(h);
        break;
    }
  }

  return descriptor;
}
