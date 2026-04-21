import { Hook } from "./hooks";

const GroupMetaKey = Symbol("aromix:group:meta");

export type GroupMeta = {
  prefix: string;
  hooks?: Hook[];
};

interface Group {
  (prefix: string, hooks?: Hook[]): ClassDecorator;
  getMeta(target: object | Function): GroupMeta;
}

export const group: Group = (prefix, hooks) => {
  return (target: any) => {
    target[GroupMetaKey] = { prefix, hooks };
  };
};

group.getMeta = (target) => {
  const ctor: any = typeof target === "function" ? target : target.constructor;
  return ctor[GroupMetaKey];
};
