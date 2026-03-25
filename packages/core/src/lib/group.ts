import { contextStorage } from "./context";
import { Middleware } from "./middleware";
import type { Maybe, Union } from "./types";

const GroupMetaKey = Symbol("aromix-group-meta");

export type GroupMeta = {
  prefix: string;
  middlewares: Middleware[];
};

export type GroupConstructor = typeof GroupBase;

export class GroupBase {
  static readonly [GroupMetaKey]: GroupMeta;

  protected get req() {
    const ctx = contextStorage.getStore();
    if (!ctx) {
      throw new Error(
        "[aromix] this.req accessed outside of a request context. " +
          "Only access inside @action methods.",
      );
    }
    return ctx;
  }

  protected get res() {
    const ctx = contextStorage.getStore();
    if (!ctx) {
      throw new Error(
        "[aromix] this.res accessed outside of a request context. " +
          "Only access inside @action methods.",
      );
    }
    return ctx;
  }
}

export function Group(
  prefix: string,
  middlewares: Middleware[] = [],
): GroupConstructor {
  class GroupInstance extends GroupBase {
    static readonly [GroupMetaKey]: GroupMeta = { prefix, middlewares };
  }

  return GroupInstance;
}

export namespace Group {
  export function getMeta(target: Union<[object, Function]>): Maybe<GroupMeta> {
    const ctor =
      typeof target === "function"
        ? target
        : Object.getPrototypeOf(target).constructor;
    return ctor[GroupMetaKey];
  }
}
