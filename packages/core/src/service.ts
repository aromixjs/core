export const deferred = <T>(initial?: T): T => initial as unknown as T

export interface Lifecycle<Private, Public> {
   setup?: (this: Public & Context<Private>) => void | Promise<void>
   teardown?: (this: Public & Context<Private>) => void | Promise<void>
}


export interface Context<Private> {
   get<Key extends keyof Private>(key: Key): Private[Key]
   set<Key extends keyof Private>(key: Key, value: Private[Key] | ((prev: Private[Key]) => Private[Key])): void
}

type Strip<Public> = Omit<Public, typeof service.id | typeof service.lifecycle | typeof service.internal>

export function service<Private extends Record<PropertyKey, unknown>, Public>(
   impl: {
      [service.id]: string
      [service.lifecycle]: Lifecycle<Private, Public>
      [service.internal]: Private
   } & Public & ThisType<Public & Context<Private>>
): Strip<Public> {


   const store = impl[service.internal]


   const ctx: Context<Private> = {
      get(key) {
         return store[key]
      },
      set(key, value) {
         store[key] = typeof value === 'function' ? (value as Function)(store[key]) : value
      },
   }



   const bound: Record<string, unknown> = {}

   for (const key of Object.keys(impl)) {
      const val = (impl as Record<string, unknown>)[key]
      if (typeof val === 'function') {
         bound[key] = val.bind({ ...bound, ...ctx })
      }
   }

   return bound as Strip<Public>

}


export namespace service {
   export const id = Symbol('aromix.service.name')
   export const lifecycle = Symbol('aromix.service.lifecycle')
   export const internal = Symbol('aromix.service.internal')
}