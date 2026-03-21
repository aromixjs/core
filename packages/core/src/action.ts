import type { Maybe, Union } from "./types";

// stored on the constructor (not the prototype) so it's accessible from the class itself
const ActionMetaKey = Symbol("oriel-action-meta");

type ActionMeta = {
  prefix: string;
  middlewares: any[];
  key: string;
};

// all actions on a class are stored as a single map keyed by method name
type ActionMetaMap = Record<string, ActionMeta>;

interface ActionDecorator {
  (prefix: string, middlewares?: any[]): MethodDecorator;
  getMeta(target: Union<[object, Function]>): Maybe<ActionMetaMap>;
  getMeta(target: Union<[object, Function]>, key: string): Maybe<ActionMeta>;
}

export const action: ActionDecorator = (prefix, middlewares = []) => {
  return (target, key) => {
    const ctor: any = target.constructor;
    // merge into existing map so multiple @action decorators on the same class don't overwrite each other
    const existing = ctor[ActionMetaKey] ?? {};
    existing[String(key)] = { prefix, middlewares, key };
    ctor[ActionMetaKey] = existing;
  };
};

// overloaded — returns single ActionMeta when key is provided, full map otherwise
action.getMeta = (target: Union<[object, Function]>, key?: string) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  const map = ctor[ActionMetaKey];
  if (key) return map?.[key];
  return map;
};