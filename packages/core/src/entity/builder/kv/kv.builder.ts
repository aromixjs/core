import { BaseBuilder } from "../base.builder";
import type { KvFieldMeta, KvFieldType, KvKeyShape, KvSchemaMeta } from "./kv.types";
class KvFieldBuilder<TValue> extends BaseBuilder {
	private meta: KvFieldMeta;

	constructor(meta: KvFieldMeta) {
		super();
		this.meta = meta;
	}

	getMeta(): KvFieldMeta {
		return this.meta;
	}

	defaultTo(v: TValue) {
		this.meta.default = v;
		return this.narrow(this, ["defaultTo"]);
	}

	internal() {
		this.meta.internal = true;
		return this.narrow(this, ["internal"]);
	}

	computed(fn: (record: unknown) => TValue) {
		this.meta.computed = fn as (record: unknown) => unknown;
		return this.narrow(this, ["computed", "defaultTo"]);
	}
}

export class KvBuilder {
	private schema: KvSchemaMeta = {
		key: "string",
		fields: [],
		version: false,
	};

	getSchema(): KvSchemaMeta {
		return this.schema;
	}

	private add<TValue>(name: string, type: KvFieldType, shape?: unknown): KvFieldBuilder<TValue> {
		const meta: KvFieldMeta = { name, type, shape, internal: false };
		this.schema.fields.push(meta);
		return new KvFieldBuilder<TValue>(meta);
	}

	key(shape: KvKeyShape): void {
		this.schema.key = shape;
	}
	ttl(seconds: number): void {
		this.schema.ttl = seconds;
	}
	version(): void {
		this.schema.version = true;
	}
	string(name: string) {
		return this.add<string>(name, "string");
	}
	number(name: string) {
		return this.add<number>(name, "number");
	}
	boolean(name: string) {
		return this.add<boolean>(name, "boolean");
	}

	// user passes the shape — TShape flows into sdk types + validation
	object<TShape extends Record<string, unknown>>(name: string, shape: TShape) {
		return this.add<TShape>(name, "object", shape);
	}

	array<TItem>(name: string, item: TItem) {
		return this.add<TItem[]>(name, "array", item);
	}
}
