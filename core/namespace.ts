import type { Maybe, Union } from "./types";

const NameSpaceMetaKey = Symbol("oriel-namespace-meta");

export type NamespaceMeta = {
  prefix: string;
  middlewares: any[];
};

export interface NamespaceDecorator {
  (prefix: string, middlewares?: any[]): ClassDecorator;
  getMeta(target: Union<[object, Function]>): Maybe<NamespaceMeta>;
}

export const namespace: NamespaceDecorator = (prefix, middlewares = []) => {
  return (target: any) => {
    target[NameSpaceMetaKey] = {
      prefix,
      middlewares,
    };
  };
};

namespace.getMeta = (target: Union<[object, Function]>) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  return ctor[NameSpaceMetaKey];
};
