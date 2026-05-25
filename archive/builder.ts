// import { extname } from "path";

// type Prettify<T> = { [K in keyof T]: T[K] } & {};
// type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
// type MapValues<T, U> = { [K in keyof T]: U };
// type MapKeys<T, K extends PropertyKey> = Record<K, T[keyof T]>;















// class ObjectBuilder<T extends object> {
// 	private constructor(private readonly data: T) {}

// 	patch(changes: DeepPartial<T>) {
// 		const merged = ObjectBuilder.deepMerge(this.data, changes);
// 		const builder = new ObjectBuilder(merged);
// 		return builder;
// 	}

// 	omit<K extends keyof T>(keys: readonly K[]) {
// 		const result = structuredClone(this.data);

// 		for (const key of keys) {
// 			delete result[key];
// 		}

// 		const builder = new ObjectBuilder<Omit<T, K>>(result);
// 		return builder;
// 	}

// 	pick<K extends keyof T>(keys: readonly K[]) {
// 		const result = this.cast<Pick<T, K>>({});

// 		for (const key of keys) {
// 			result[key] = this.data[key];
// 		}

// 		const builder = new ObjectBuilder<Pick<T, K>>(result);
// 		return builder;
// 	}

// 	defaults(fallbacks: Partial<T>) {
// 		const result = structuredClone(this.data);

// 		for (const key in fallbacks) {
// 			const value = fallbacks[key];

// 			if (result[key] === undefined && value !== undefined) {
// 				result[key] = value;
// 			}
// 		}

// 		const builder = new ObjectBuilder(result);
// 		return builder;
// 	}

// 	mapValues<U>(fn: (val: T[keyof T], key: keyof T) => U) {
// 		const result = this.cast<MapValues<T, U>>({});
// 		const keys = this.cast<Array<keyof T>>(Object.keys(this.data));

// 		for (const key of keys) {
// 			result[key] = fn(this.data[key], key);
// 		}

// 		const builder = new ObjectBuilder<MapValues<T, U>>(result);
// 		return builder;
// 	}

// 	mapKeys<K extends PropertyKey>(fn: (key: keyof T) => K) {
// 		const result = this.cast<MapKeys<T, K>>({});
// 		const keys = this.cast<Array<keyof T>>(Object.keys(this.data));

// 		for (const key of keys) {
// 			result[fn(key)] = this.data[key];
// 		}

// 		const builder = new ObjectBuilder<MapKeys<T, K>>(result);
// 		return builder;
// 	}

// 	filter(fn: (val: T[keyof T], key: keyof T) => boolean) {
// 		const result = this.cast<Partial<T>>({});
// 		const keys = this.cast<Array<keyof T>>(Object.keys(this.data));

// 		for (const key of keys) {
// 			const val = this.data[key];

// 			if (fn(val, key)) {
// 				result[key] = val;
// 			}
// 		}

// 		const builder = new ObjectBuilder<Partial<T>>(result);
// 		return builder;
// 	}

// 	clone() {
// 		const copy = structuredClone(this.data);
// 		const builder = new ObjectBuilder(copy);
// 		return builder;
// 	}

// 	value() {
// 		const result = this.cast<Prettify<T>>(this.data);
// 		return result;
// 	}

// 	static create<T extends object>(val: T) {
// 		const builder = new ObjectBuilder(val);
// 		return builder;
// 	}

// 	private cast<U>(value: unknown): U {
// 		return value as U;
// 	}

// 	private static deepMerge<T extends object>(base: T, changes: DeepPartial<T>) {
// 		const result = ObjectBuilder.castStatic<Record<string, unknown>>(structuredClone(base));

// 		for (const key in changes) {
// 			const change = changes[key];
// 			const existing = result[key];

// 			if (
// 				change && typeof change === "object" && !Array.isArray(change) && existing
// 				&& typeof existing === "object" && !Array.isArray(existing)
// 			) {
// 				result[key] = ObjectBuilder.deepMerge(existing, change);
// 			}
// 			else if (change !== undefined) {
// 				result[key] = change;
// 			}
// 		}

// 		const output = ObjectBuilder.castStatic<T>(result);
// 		return output;
// 	}

// 	private static castStatic<U>(value: unknown): U {
// 		return value as U;
// 	}
// }

// export function object<T extends object>(val: T) {
// 	const builder = ObjectBuilder.create(val);
// 	return builder;
// }
export {}
