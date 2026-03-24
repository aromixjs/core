import { action } from "./lib/action";
import {
  type ContextSchema,
  contextStorage,
  getContext,
  type RawContext,
} from "./lib/context";
import { inject, injectNew, provide } from "./lib/di";
import { group } from "./lib/group";
import { type AromixDescriptor, make } from "./lib/make";
import { type Result, result } from "./lib/result";

export {
  action,
  contextStorage,
  getContext,
  group,
  inject,
  injectNew,
  make,
  provide,
  result,
  type AromixDescriptor,
  type ContextSchema,
  type RawContext,
  type Result,
};
