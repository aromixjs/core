import { Hook } from "./hooks";
import type { Maybe, Union } from "./types";

const GroupMetaKey = Symbol("aromix-group-meta");

export type GroupMeta = {
  prefix: string;
  hooks?: Hook[];
};

export function group(prefix: string, hooks?: Hook[]): ClassDecorator {
  return (target: any) => {
    target[GroupMetaKey] = { prefix, hooks } satisfies GroupMeta;
  };
}

export namespace group {
  export function getMeta(target: Union<[object, Function]>): Maybe<GroupMeta> {
    const ctor: any = typeof target === "function" ? target : target.constructor;
    return ctor[GroupMetaKey];
  }
}
