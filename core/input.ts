import { StandardSchemaV1 } from "@standard-schema/spec";

export interface InputSchema {
  body?: StandardSchemaV1<Record<string, unknown>>;
  headers?: StandardSchemaV1<Record<string, unknown>>;
  cookies?: StandardSchemaV1<Record<string, unknown>>;
}

export function input(schema?: InputSchema) {
  const body = schema?.body?.["~standard"].validate({
    damo: "string",
  });
}
