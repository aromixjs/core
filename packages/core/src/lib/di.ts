import type { Maybe, Union } from "./types";

const ServiceRegistry = new Map<symbol, object>();
const ServiceMetaKey = Symbol("aromix-service-meta");

export type ServiceMeta = {
  token: symbol;
};

export function provide(): ClassDecorator {
  return (target: any) => {
    target[ServiceMetaKey] = {
      token: Symbol(`${crypto.randomUUID()}:${target.name || "Anonymous"}`),
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
 * Returns the singleton instance for the given class.
 * Creates and caches it on first call, returns the same instance on subsequent calls.
 */
export function inject<T extends new () => any>(ctor: T): InstanceType<T> {
  const { token } = provide.getMeta(ctor) || {};

  if (!token) throw new Error("No Token Found");

  if (ServiceRegistry.has(token))
    return ServiceRegistry.get(token) as InstanceType<T>;

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