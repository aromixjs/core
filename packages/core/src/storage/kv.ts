export interface KvAdapter {
   get(key: string): Promise<unknown>;
   set(key: string, value: unknown): Promise<void>;
   delete(key: string): Promise<void>;
   has(key: string): Promise<boolean>;
}

export interface KvStorage {
   readonly __type: "kv";
   readonly adapter: KvAdapter;
}


export function createKvStorage(adapter: KvAdapter): KvStorage {
   return {
      __type: "kv",
      adapter,
   };
}
