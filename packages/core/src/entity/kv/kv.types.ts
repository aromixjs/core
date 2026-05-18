import * as v from "valibot";


export type Schema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export const $schema = Symbol("schema");
export const $internal = Symbol("internal");

export interface KvField {
   [$schema]: Schema;
   [$internal]?: boolean;
}

export type BaseShape = Record<string, KvField>;

export type Entries<Shape extends BaseShape> = {
	[K in keyof Shape]: Shape[K][typeof $schema];
};

export type InferShape<Shape extends BaseShape> = {
	[K in keyof Shape]: v.InferOutput<Shape[K][typeof $schema]>;
};
