import type * as v from "valibot";

export type Schema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
export interface KvFieldMeta {
	name: string;
	schema: Schema;
}

export interface KvSchemaMeta {
	key: string;
	fields: KvFieldMeta[];
}
