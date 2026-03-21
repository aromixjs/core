import type { Maybe, Union } from "./types";

// module-level singleton registry — keyed by unique symbol token per class
const ServiceRegistry = new Map<symbol, object>();
const ServiceMetaKey = Symbol("oriel-service-meta");

export type ServiceMeta = {
  token: symbol;
};

export interface ServiceDecorator {
  (): ClassDecorator;
  getMeta(target: Union<[object, Function]>): Maybe<ServiceMeta>;
}

export const provide: ServiceDecorator = () => {
  return (target: any) => {
    // UUID prefix ensures uniqueness even if two classes share the same name
    target[ServiceMetaKey] = {
      token: Symbol(`${crypto.randomUUID()}:${target.name || "Anonymous"}`),
    } satisfies ServiceMeta;
  };
};

// normalizes instance → constructor so getMeta works on both
provide.getMeta = (target: Union<[object, Function]>) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  return ctor[ServiceMetaKey];
};

/**
 * Returns the singleton instance for the given class.
 * Creates and caches it on first call, returns the same instance on subsequent calls.
 */
export function inject<T extends new () => any>(ctor: T): InstanceType<T> {
  const { token } = provide.getMeta(ctor) || {};

  if (!token) throw new Error("No Token Found");

  if (ServiceRegistry.has(token)) return ServiceRegistry.get(token) as InstanceType<T>;

  const instance = new ctor();
  ServiceRegistry.set(token, instance);
  return instance;
}

/**
 * Creates a fresh instance on every call — no caching, no shared state.
 * Use for stateful per-operation classes where sharing would be incorrect.
 */
export function injectNew<T extends new () => any>(ctor: T): InstanceType<T> {
  const { token } = provide.getMeta(ctor) || {};
  if (!token) throw new Error("No Token Found");
  return new ctor();
}