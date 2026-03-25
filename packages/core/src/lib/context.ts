import { StandardSchemaV1 } from "@standard-schema/spec";
import { AsyncLocalStorage } from "async_hooks";

export type ReplyOptions = {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
};

export type ReplyValue = Readonly<{
  _type: "reply";
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}>;

export type RawContext = {
  body: unknown;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip: string;
  action: string;
  reply: (options: ReplyOptions) => ReplyValue;
};

export interface ContextSchema {
  body?: StandardSchemaV1;
  headers?: StandardSchemaV1;
  cookies?: StandardSchemaV1;
}

export const contextStorage = new AsyncLocalStorage<RawContext>();

async function validate<S extends StandardSchemaV1>(
  schema: S,
  value: unknown,
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) result = await result;
  if (result.issues) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.value;
}

type ResolvedContext<T extends ContextSchema> = {
  body: T["body"] extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<T["body"]>
    : unknown;
  headers: T["headers"] extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<T["headers"]>
    : Record<string, string>;
  cookies: T["cookies"] extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<T["cookies"]>
    : Record<string, string>;
  ip: string;
  action: string;
  reply: (options: ReplyOptions) => ReplyValue;
};

export function getContext(): Promise<RawContext>;
export function getContext<T extends ContextSchema>(
  schema: T,
): Promise<ResolvedContext<T>>;
export async function getContext<T extends ContextSchema>(schema?: T) {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new Error(
      "[aromix] No active request context. Ensure the HTTP adapter is running.",
    );
  }

  if (!schema) return ctx;

  const [body, headers, cookies] = await Promise.all([
    schema.body ? validate(schema.body, ctx.body) : ctx.body,
    schema.headers ? validate(schema.headers, ctx.headers) : ctx.headers,
    schema.cookies ? validate(schema.cookies, ctx.cookies) : ctx.cookies,
  ]);

  return {
    body,
    headers,
    cookies,
    ip: ctx.ip,
    action: ctx.action,
    reply: ctx.reply,
  };
}
