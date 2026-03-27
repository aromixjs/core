import { Hook } from "./hooks";
import type { Maybe, Union } from "./types";

const ActionMetaKey = Symbol("aromix-action-meta");

export type ActionMeta = {
  prefix: string;
  hooks?: Hook[];
  key: string;
};

export type ActionMetaMap = Record<string, ActionMeta>;

export function action(prefix: string, hooks?: Hook[]): MethodDecorator {
  return (target, key) => {
    const ctor: any = target.constructor;
    const existing: ActionMetaMap = ctor[ActionMetaKey] ?? {};
    existing[String(key)] = { prefix, hooks, key: String(key) };
    ctor[ActionMetaKey] = existing;
  };
}

export namespace action {
  export function getMeta(target: Union<[object, Function]>): Maybe<ActionMetaMap>;
  export function getMeta(target: Union<[object, Function]>, key: string): Maybe<ActionMeta>;
  export function getMeta(target: Union<[object, Function]>, key?: string): Maybe<ActionMetaMap | ActionMeta> {
    const ctor: any = typeof target === "function" ? target : target.constructor;
    const map = ctor[ActionMetaKey];
    if (key) return map?.[key];
    return map;
  }
}
