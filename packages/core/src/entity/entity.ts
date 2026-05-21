import { FieldModifier } from "../kv/builder";
import { KvStorage } from "../kv/storage";

interface EntityOptions {
	name: string;
	storage: KvStorage;
	schema: Record<string, FieldModifier>;
}

export function entity(options: EntityOptions) {

	return options
}
