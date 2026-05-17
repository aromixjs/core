export interface KvSetOptions {
	ttl?: number;
}

export interface KvListOptions {
	prefix?: string;
	limit?: number;
	cursor?: string;
}

export interface KvListResult {
	keys: string[];
	cursor?: string;
}

export interface KvAdapter {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown, options?: KvSetOptions): Promise<void>;
	delete(key: string): Promise<void>;
	has(key: string): Promise<boolean>;
	getMany(keys: string[]): Promise<Record<string, unknown>>;
	setMany(entries: Record<string, unknown>, options?: KvSetOptions): Promise<void>;
	deleteMany(keys: string[]): Promise<void>;
	list(options?: KvListOptions): Promise<KvListResult>;
	cas(key: string, expected: unknown, next: unknown): Promise<boolean>;
}

export interface KvStorage {
	readonly __type: "kv";
	readonly adapter: KvAdapter;
}
