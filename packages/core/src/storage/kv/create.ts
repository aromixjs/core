import type { KvAdapter, KvStorage } from "./types";

export function createKvStorage(adapter: KvAdapter): KvStorage {
	return {
		__type: "kv",
		adapter,
	};
}
