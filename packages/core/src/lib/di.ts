import type { Maybe, Union } from "./types";

const ServiceMetaKey = Symbol("aromix-service-meta");
const ServiceRegistry = new Map<symbol, unknown>();

export type ServiceMeta = {
  token: symbol;
  name: string;
};

/**
 * Decorator to mark a class as a service
 */
export function provide(): ClassDecorator {
  return (target: any) => {
    const name = target.name || "Anonymous";
    target[ServiceMetaKey] = {
      token: Symbol(`service:${crypto.randomUUID()}:${name}`),
      name,
    } satisfies ServiceMeta;
  };
}

export namespace provide {
  export function getMeta(target: Union<[object, Function]>): Maybe<ServiceMeta> {
    const ctor: any = typeof target === "function" ? target : target.constructor;
    return ctor[ServiceMetaKey];
  }
}

/**
 * Get singleton instance.
 * Works for both @provide() decorated classes and services registered via plugins.
 */
export function inject<T>(ctor: new (...args: any[]) => T): T {
  const meta = provide.getMeta(ctor);

  if (!meta?.token) {
    throw new Error(
      `No service metadata found for ${ctor.name || "unknown constructor"}. ` +
        `Did you forget @provide() or register it via plugin?`
    );
  }

  if (ServiceRegistry.has(meta.token)) {
    return ServiceRegistry.get(meta.token) as T;
  }

  const instance = new ctor();
  ServiceRegistry.set(meta.token, instance);
  return instance;
}

/**
 * Always create a fresh instance (never cached)
 */
export function injectNew<T>(ctor: new (...args: any[]) => T): T {
  const meta = provide.getMeta(ctor);
  if (!meta?.token) {
    throw new Error(
      `No service metadata found for ${ctor.name || "unknown constructor"}. ` +
        `Did you forget @provide() or register it via plugin?`
    );
  }

  // For plugin-registered services, we always respect the pre-created singleton,
  // but since injectNew wants fresh, we still instantiate new here.
  // (If you want plugin factories to be re-run, we can adjust later)
  return new ctor();
}

/**
 * Register a service from plugin (or manually).
 * Immediately creates the instance and stores it in the main registry.
 */
export function registerService<T>(ctor: new (...args: any[]) => T, factory: () => T): void {
  const meta = provide.getMeta(ctor);
  if (!meta?.token) {
    throw new Error(
      `Cannot register service ${ctor.name || "unknown"}: ` + `Class must be decorated with @provide() first.`
    );
  }

  if (ServiceRegistry.has(meta.token)) {
    console.warn(`Service ${meta.name} is already registered. Overwriting.`);
  }

  const instance = factory();
  ServiceRegistry.set(meta.token, instance);
}

// Optional: Clear registry (useful for testing / hot reload)
export function clearServiceRegistry(): void {
  ServiceRegistry.clear();
}
