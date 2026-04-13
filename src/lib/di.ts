const ServiceMetaKey = Symbol("aromix-service-meta");
const ServiceRegistry = new Map<symbol, unknown>();

export type ServiceMeta = {
  token: symbol;
  name: string;
};

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
  export function getMeta(target: object | Function): ServiceMeta | undefined {
    const ctor: any =
      typeof target === "function" ? target : target.constructor;
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
        `Did you forget @provide() or register it via plugin?`,
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
        `Did you forget @provide() or register it via plugin?`,
    );
  }

  // For plugin-registered services, we always respect the pre-created singleton,
  // but since injectNew wants fresh, we still instantiate new here.
  // (If you want plugin factories to be re-run, we can adjust later)
  return new ctor();
}
