// TODO: re-enable after kv builder re-implementation
// import { kvSchema } from "./kv/builder";
import { KvStorage } from "./kv/storage";

interface EntityOptions {
	name: string;
	storage: KvStorage;
	// schema: ReturnType<typeof kvSchema>;
	schema: unknown;
}

export function entity(options: EntityOptions) {}
