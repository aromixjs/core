import { StandardSchemaV1 } from "@standard-schema/spec";
import { AsyncLocalStorage } from "async_hooks";

// TODO: add cookies back once cookie parsing is fixed
export type RawRequest = {
  body: unknown;
  headers: Record<string, string>;
  ip: string;
  action: string;
};

export type RequestSchema = {
  body?: StandardSchemaV1;
  headers?: StandardSchemaV1;
};

export type ValidatedRequest<T extends RequestSchema> = {
  body: T["body"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["body"]> : unknown;
  headers: T["headers"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["headers"]> : Record<string, string>;
};

export const requestStorage = new AsyncLocalStorage<RawRequest>();

async function runSchema<S extends StandardSchemaV1>(
  schema: S,
  value: unknown
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) result = await result;
  if (result.issues) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.value;
}

export function receive(): RawRequest {
  const raw = requestStorage.getStore();
  if (!raw) throw new Error("[aromix] No active request. Ensure the HTTP adapter is running.");
  return raw;
}

export namespace receive {
  export async function validate<T extends RequestSchema>(schema: T): Promise<ValidatedRequest<T>> {
    const raw = requestStorage.getStore();
    if (!raw) throw new Error("[aromix] No active request. Ensure the HTTP adapter is running.");

    const [body, headers] = await Promise.all([
      schema.body ? runSchema(schema.body, raw.body) : Promise.resolve(raw.body),
      schema.headers ? runSchema(schema.headers, raw.headers) : Promise.resolve(raw.headers),
    ]);

    return { body, headers } as ValidatedRequest<T>;
  }
}
