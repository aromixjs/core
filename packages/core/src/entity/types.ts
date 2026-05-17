import { KvStorage } from "../storage/kv/types";
import { KvBuilder } from "./kv/kv.builder";

export interface EntityOptions {
	name: string;
	storage: KvStorage;
	schema: (builder: KvBuilder) => void;
}
