import { StandardSchemaV1 } from "@standard-schema/spec";
import { AsyncLocalStorage } from "async_hooks";

export type RequestContext = {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
};

export interface InputSchema {
  body?: StandardSchemaV1;
  headers?: StandardSchemaV1;
}

export const contextStorage = new AsyncLocalStorage<RequestContext>();

export interface ResponsePayload {
  status: number;
  data: unknown;
}

async function validate<S extends StandardSchemaV1>(
  schema: S,
  value: unknown,
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) result = await result;
  if (result.issues) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.value;
}

export function input(): Promise<RequestContext>;
export function input<T extends InputSchema>(
  schema: T,
): Promise<{
  body: StandardSchemaV1.InferOutput<NonNullable<T["body"]>>;
  headers: StandardSchemaV1.InferOutput<NonNullable<T["headers"]>>;
}>;

export async function input<T extends InputSchema>(schema?: T) {
  const ctx = contextStorage.getStore();
  if (!ctx)
    throw new Error(
      "[aromix] No active request context. Ensure the HTTP adapter is running.",
    );
  if (!schema) return ctx;

  return {
    body: schema.body ? await validate(schema.body, ctx.body) : ctx.body,
    headers: schema.headers
      ? await validate(schema.headers, ctx.headers)
      : ctx.headers,
  };
}
