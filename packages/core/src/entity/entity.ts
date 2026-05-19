import { kvSchema } from "./kv/builder";
import { KvStorage } from "./kv/storage";

interface EntityOptions {
	name: string;
	storage: KvStorage;
	schema: ReturnType<typeof kvSchema>;
}

export function entity(options: EntityOptions) {}
