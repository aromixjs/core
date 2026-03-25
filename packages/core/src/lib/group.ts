import { Middleware } from "./middleware";
import type { Maybe, Union } from "./types";

// Symbol to avoid collisions with user-defined properties on the constructor
const GroupMetaKey = Symbol("aromix-group-meta");

export type GroupMeta = {
  prefix: string;
  middlewares: Middleware[];
};

/**
 * Groups a handler class under a route prefix.
 *
 * @example
 * @group("users")
 * class UserHandler { ... }
 */
export interface GroupDecorator {
  (prefix: string, middlewares?: Middleware[]): ClassDecorator;
  getMeta(target: Union<[object, Function]>): Maybe<GroupMeta>;
}

export const group: GroupDecorator = (prefix, middlewares = []) => {
  return (target: any) => {
    target[GroupMetaKey] = { prefix, middlewares };
  };
};

// normalizes instance → constructor so getMeta works on both
group.getMeta = (target: Union<[object, Function]>) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  return ctor[GroupMetaKey];
};
