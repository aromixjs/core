import type * as v from "valibot";

export const $def = Symbol("def");

export type AnySchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;
export type ClientOp = "read" | "insert" | "update";
export type FieldDefault = undefined | (() => unknown) | string | number | boolean | null;

export interface FieldDef {
	kind: "stored" | "computed";
	valueType: "string" | "number" | "boolean";
	valibotSchema: AnySchema;
	notNull: boolean;
	default: FieldDefault;
	client: { read: boolean; insert: boolean; update: boolean };
	computeFn: ((row: Record<string, unknown>) => unknown) | undefined;
}

export interface KvFieldBuilder {
	readonly [$def]: FieldDef;
	notNull(): KvFieldBuilder;
	default(value: FieldDefault): KvFieldBuilder;
	client(ops?: ClientOp[]): KvFieldBuilder;
	computed(fn: (row: Record<string, unknown>) => unknown): KvFieldBuilder;
}
