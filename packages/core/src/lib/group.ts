import { Middleware } from "./middleware";
import type { Maybe, Union } from "./types";

const GroupMetaKey = Symbol("aromix-group-meta");

export type GroupMeta = {
  prefix: string;
  middlewares: Middleware[];
};

export function group(prefix: string, middlewares: Middleware[] = []): ClassDecorator {
  return (target: any) => {
    target[GroupMetaKey] = { prefix, middlewares } satisfies GroupMeta;
  };
}

export namespace group {
  export function getMeta(target: Union<[object, Function]>): Maybe<GroupMeta> {
    const ctor: any = typeof target === "function" ? target : target.constructor;
    return ctor[GroupMetaKey];
  }
}