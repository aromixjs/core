import type { BaseShape } from "./kv/kv.types";
import { KvDefinition } from "./kv/kv.define";
import { KvEntity } from "./kv/kv.entity";
import { KvStorage } from "../storage/kv";

export interface EntityOptions<Shape extends BaseShape> {
	name:    string;
	storage: KvStorage;
	schema:  KvDefinition<Shape>;
}

export function entity<Shape extends BaseShape>(options: EntityOptions<Shape>) {
	const definition     = options.schema;
	const inputSchema    = definition.buildSchema();
	const internalFields = definition.getInternalFields();
	const extendFn       = definition.getExtendFn();

	return new KvEntity<Shape>(
		options.name,
		options.storage,
		inputSchema,
		internalFields,
		extendFn,
	);
}