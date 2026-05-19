// Resolves Omit<>, Pick<>, Record<> and any other mapped types into
// a clean plain object type. Applied at value() so intermediate chain
// types stay cheap but the final result is always readable.
type Resolve<T> = { [K in keyof T]: T[K] } & {}





class ObjectBuilder<T extends object> {
   constructor(private readonly initialObject: T) { }

   // Shallow partial update — keys you pass override, rest untouched.
   patch(changes: Partial<T>): ObjectBuilder<T> {
      return new ObjectBuilder<T>({ ...this.initialObject, ...changes })
   }

   // Remove keys. Type shrinks accordingly.
   omit<K extends keyof T>(keys: readonly K[]): ObjectBuilder<Omit<T, K>> {
      const result = { ...this.initialObject }
      for (const key of keys) delete result[key]
      return new ObjectBuilder(result as Omit<T, K>)
   }

   // Keep only the named keys.
   pick<K extends keyof T>(keys: readonly K[]): ObjectBuilder<Pick<T, K>> {
      const result = {} as Pick<T, K>
      for (const key of keys) result[key] = this.initialObject[key]
      return new ObjectBuilder(result)
   }

   // Fill keys that are undefined. Existing values are never overwritten.
   defaults(fallbacks: Partial<T>): ObjectBuilder<T> {
      const result = { ...this.initialObject }
      for (const key in fallbacks)
         if ((result as Record<string, unknown>)[key] === undefined)
            (result as Record<string, unknown>)[key] = fallbacks[key]
      return new ObjectBuilder<T>(result)
   }

   // Transform every value with fn.
   mapValues<U>(fn: (val: T[keyof T], key: keyof T) => U): ObjectBuilder<{ [K in keyof T]: U }> {
      const result = {} as { [K in keyof T]: U }
      for (const key in this.initialObject) result[key] = fn(this.initialObject[key] as T[keyof T], key)
      return new ObjectBuilder(result)
   }

   // Rename every key with fn.
   mapKeys<K extends PropertyKey>(fn: (key: keyof T) => K): ObjectBuilder<Record<K, T[keyof T]>> {
      const result = {} as Record<K, T[keyof T]>
      for (const key in this.initialObject) result[fn(key)] = this.initialObject[key] as T[keyof T]
      return new ObjectBuilder(result)
   }

   // Keep only entries where fn returns true.
   filter(fn: (val: T[keyof T], key: keyof T) => boolean): ObjectBuilder<Partial<T>> {
      const result = {} as Partial<T>
      for (const key in this.initialObject)
         if (fn(this.initialObject[key] as T[keyof T], key)) result[key] = this.initialObject[key]
      return new ObjectBuilder(result)
   }

   // Deep clone. Same type.
   clone(): ObjectBuilder<T> {
      return new ObjectBuilder<T>(structuredClone(this.initialObject))
   }

   // Exit the chain. Returns a clean resolved plain object type — no Omit<>, Pick<>, etc.
   value(): Resolve<T> {
      return this.initialObject as Resolve<T>
   }
}

export function object<T extends object>(val: T): ObjectBuilder<T> {
   return new ObjectBuilder(val)
}


const data = object({


   user: 'test',
   name: 'demo'

})


const obj = data.omit(['name']).patch({ user: 'fast' }).value()


console.log(obj);
