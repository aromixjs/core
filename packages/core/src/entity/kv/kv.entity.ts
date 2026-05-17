import * as v from "valibot";
import { KvStorage } from "../../storage/kv/types";
import type { KvSchemaMeta, Schema } from "./kv.types";

export class KvEntity {
	private storage: KvStorage;
	private schema: KvSchemaMeta;
	private inputSchema: Schema;

	constructor(storage: KvStorage, schema: KvSchemaMeta) {
		this.storage = storage;
		this.schema = schema;
		this.inputSchema = this.buildInputSchema();
	}

	private buildInputSchema(): Schema {
		const entries: Record<string, Schema> = {};

		for (const field of this.schema.fields) {
			entries[field.name] = field.schema;
		}

		return v.object(entries);
	}

	private serializeKey(key: unknown): string {
		return `${this.schema.key}:${String(key)}`;
	}

	private validate(data: Record<string, unknown>): void {
		v.parse(this.inputSchema, data);
	}

	async get(key: unknown): Promise<unknown> {
		const serialized = this.serializeKey(key);
		return this.storage.adapter.get(serialized);
	}

	async set(key: unknown, value: Record<string, unknown>): Promise<void> {
		const serialized = this.serializeKey(key);
		this.validate(value);
		await this.storage.adapter.set(serialized, value);
	}

	async has(key: unknown): Promise<boolean> {
		const serialized = this.serializeKey(key);
		return this.storage.adapter.has(serialized);
	}

	async delete(key: unknown): Promise<void> {
		const serialized = this.serializeKey(key);
		return this.storage.adapter.delete(serialized);
	}
}
