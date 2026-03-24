import { action } from "./lib/action";
import {
  type Context,
  type ContextSchema,
  contextStorage,
  getContext,
  type ResponsePayload,
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
  type ContextSchema as InputSchema,
  type Context as RequestContext,
  type ResponsePayload,
  type Result
};

