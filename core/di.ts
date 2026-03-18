import type { Maybe, Union } from "./types";

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
    target[ServiceMetaKey] = {
      token: Symbol(`${crypto.randomUUID()}:${target.name || "Anonymous"}`),
    } satisfies ServiceMeta;
  };
};

provide.getMeta = (target: Union<[object, Function]>) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  return ctor[ServiceMetaKey];
};

export function inject<T extends new () => any>(ctor: T): InstanceType<T> {
  const { token } = provide.getMeta(ctor) || {};

  if (!token) {
    throw new Error("No Token Found");
  }

  if (ServiceRegistry.has(token)) {
    const instance = ServiceRegistry.get(token) as InstanceType<T>;
    return instance;
  } else {
    const instance = new ctor();
    ServiceRegistry.set(token, instance);
    return instance;
  }
}

export function injectNew<T extends new () => any>(ctor: T): InstanceType<T> {
  const { token } = provide.getMeta(ctor) || {};

  if (!token) {
    throw new Error("No Token Found");
  }
  const instance = new ctor();
  return instance;
}
