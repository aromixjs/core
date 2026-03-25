import { Middleware } from "./middleware";
import type { Maybe, Union } from "./types";

const ActionMetaKey = Symbol("aromix-action-meta");

type ActionMeta = {
  prefix: string;
  middlewares: Middleware[];
  key: string;
};

type ActionMetaMap = Record<string, ActionMeta>;

interface ActionDecorator {
  (prefix: string, middlewares?: Middleware[]): MethodDecorator;
  getMeta(target: Union<[object, Function]>): Maybe<ActionMetaMap>;
  getMeta(target: Union<[object, Function]>, key: string): Maybe<ActionMeta>;
}

export const action: ActionDecorator = (prefix, middlewares = []) => {
  return (target, key) => {
    const ctor: any = target.constructor;
    const existing = ctor[ActionMetaKey] ?? {};
    existing[String(key)] = { prefix, middlewares, key };
    ctor[ActionMetaKey] = existing;
  };
};

action.getMeta = (target: Union<[object, Function]>, key?: string) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  const map = ctor[ActionMetaKey];
  if (key) return map?.[key];
  return map;
};
