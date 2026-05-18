import * as v from "valibot";
import { $internal, $schema, KvField, Schema } from "./kv.types";

class KvFieldBuilder implements KvField {
	[$schema]:    Schema;
	[$internal]?: boolean;

	constructor(schema: Schema) {
		this[$schema] = schema;
	}

	internal(): Omit<this, "internal"> {
		this[$internal] = true;
		return this;
	}
}

export const kv = {
	string():  KvFieldBuilder { return new KvFieldBuilder(v.string()); },
	number():  KvFieldBuilder { return new KvFieldBuilder(v.number()); },
	boolean(): KvFieldBuilder { return new KvFieldBuilder(v.boolean()); },
	binary():  KvFieldBuilder { return new KvFieldBuilder(v.instance(Uint8Array)); },

	object(shape: Record<string, KvField>): KvFieldBuilder {
		const entries: Record<string, Schema> = {};

		for (const [key, field] of Object.entries(shape)) {
			entries[key] = field[$schema];
		}

		return new KvFieldBuilder(v.object(entries));
	},

	array(item: KvField): KvFieldBuilder {
		return new KvFieldBuilder(v.array(item[$schema]));
	},
}