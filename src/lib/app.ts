import { Hook } from "./hooks";
import { Router, RouteValue } from "./router";

export class App {
  private readonly routeRegistry = new Map<string, RouteValue>();
  private readonly providers = new Map<string, unknown>();
  private readonly hooks = new Set<Hook>();

  router(instance: Router) {
    for (const [path, value] of instance.getRegistry()) {
      this.routeRegistry.set(path, value);
    }
  }

  provide<T>(key: string, value: T) {
    this.providers.set(key, value);
  }

  hook(ref: Hook) {
    this.hooks.add(ref);
  }

  listen(port: number, cb?: () => void) {
    cb?.();
  }
}
export function createApp() {
  return new App();
}
