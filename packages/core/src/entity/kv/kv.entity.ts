import * as v from "valibot";
import type { BaseShape, Entries } from "./kv.types";
import { KvStorage } from "../../storage/kv";

export class KvEntity<Shape extends BaseShape> {
	private storage: KvStorage;
	private key: string;
	private inputSchema: v.ObjectSchema<Entries<Shape>, undefined>;
	private internalFields: string[];
	private extendFn?: (record: Record<string, unknown>) => Record<string, unknown>;

	constructor(
		key: string,
		storage: KvStorage,
		inputSchema: v.ObjectSchema<Entries<Shape>, undefined>,
		internalFields: string[],
		extendFn?: (record: Record<string, unknown>) => Record<string, unknown>,
	) {
		this.key            = key;
		this.storage        = storage;
		this.inputSchema    = inputSchema;
		this.internalFields = internalFields;
		this.extendFn       = extendFn;
	}

	private serializeKey(key: unknown): string {
		return `${this.key}:${String(key)}`;
	}

	private validate(data: unknown): v.InferOutput<v.ObjectSchema<Entries<Shape>, undefined>> {
		return v.parse(this.inputSchema, data);
	}

	private present(raw: Record<string, unknown>): Record<string, unknown> {
		const result: Record<string, unknown> = { ...raw };

		for (const field of this.internalFields) {
			delete result[field];
		}

		if (this.extendFn) {
			const extended = this.extendFn(result);

			for (const [key, val] of Object.entries(extended)) {
				result[key] = val;
			}
		}

		return result;
	}

	async get(key: unknown): Promise<v.InferOutput<v.ObjectSchema<Entries<Shape>, undefined>> | null> {
		const serialized = this.serializeKey(key);
		const raw        = await this.storage.adapter.get(serialized);

		if (raw === null || raw === undefined) {
			return null;
		}

		const validated = this.validate(raw);
		return this.present(validated as Record<string, unknown>) as v.InferOutput<v.ObjectSchema<Entries<Shape>, undefined>>;
	}

	async set(key: unknown, value: v.InferOutput<v.ObjectSchema<Entries<Shape>, undefined>>): Promise<void> {
		const serialized = this.serializeKey(key);
		const validated  = this.validate(value);
		await this.storage.adapter.set(serialized, validated);
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