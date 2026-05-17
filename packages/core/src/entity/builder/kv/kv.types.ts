export type KvFieldType = "string" | "number" | "boolean" | "object" | "array";

export type KvKeyShape = "string" | "number" | Record<string, "string" | "number">;

export interface KvFieldMeta {
	name: string;
	type: KvFieldType;
	shape?: unknown;
	default?: unknown;
	internal: boolean;
	computed?: (record: unknown) => unknown;
}

export interface KvSchemaMeta {
	key: KvKeyShape;
	fields: KvFieldMeta[];
	ttl?: number;
	version: boolean;
}
