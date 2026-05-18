import * as v from "valibot";
import { $internal, $schema, BaseShape, Entries, InferShape } from "./kv.types";

export class KvDefinition<Shape extends BaseShape> {
	private shape: Shape;
	private extendFn?: (record: Record<string, unknown>) => Record<string, unknown>;

	constructor(shape: Shape) {
		this.shape = shape;
	}

	extend(fn: (t: InferShape<Shape>) => Record<string, unknown>): this {
		this.extendFn = fn as (record: Record<string, unknown>) => Record<string, unknown>;
		return this;
	}

	buildSchema(): v.ObjectSchema<Entries<Shape>, undefined> {
		const entries = {} as Entries<Shape>;

		for (const key in this.shape) {
			entries[key] = this.shape[key][$schema] as Entries<Shape>[typeof key];
		}

		return v.object(entries);
	}

	getExtendFn(): ((record: Record<string, unknown>) => Record<string, unknown>) | undefined {
		return this.extendFn;
	}

	getInternalFields(): string[] {
		const internals: string[] = [];

		for (const key in this.shape) {
			if (this.shape[key][$internal]) {
				internals.push(key);
			}
		}

		return internals;
	}
}

export function defineKv<Shape extends BaseShape>(shape: Shape): KvDefinition<Shape> {
	return new KvDefinition(shape);
}