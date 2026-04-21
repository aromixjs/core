import { Hook } from "./hooks";

const ActionMetaKey = Symbol("aromix:action:meta");

export type ActionMeta = {
  prefix: string;
  hooks?: Hook[];
  key: string;
};

export type ActionMetaMap = Record<string, ActionMeta>;

interface Action {
  (prefix: string, hooks?: Hook[]): MethodDecorator;
  getMeta(target: object | Function, key: string): ActionMeta | undefined;
}

export const action: Action = (prefix, hooks) => {
  return (target, key) => {
    const ctor: any = target.constructor;
    const existing: ActionMetaMap = ctor[ActionMetaKey] ?? {};

    existing[String(key)] = {
      prefix,
      hooks,
      key: String(key),
    };

    ctor[ActionMetaKey] = existing;
  };
};

action.getMeta = (target, key) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  const map = ctor[ActionMetaKey];
  return map[key];
};
