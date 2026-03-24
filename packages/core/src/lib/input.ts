import { StandardSchemaV1 } from "@standard-schema/spec";
import { AsyncLocalStorage } from "async_hooks";

export interface InputSchema {
  body?: StandardSchemaV1<Record<string, unknown>>;
  headers?: StandardSchemaV1<Record<string, unknown>>;
}

export interface ResponsePayload {
  status: number;
  data: unknown;
}

export type RequestContext = {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export const contextStorage = new AsyncLocalStorage<RequestContext>();

export function input<T extends InputSchema>(schema?: T) {
  const ctx = contextStorage.getStore();

  if (!ctx) {
    throw new Error("[aromix] input() called outside of a request context.");
  }

  return ctx;
}
