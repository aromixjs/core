import type { StandardSchemaV1 } from '@standard-schema/spec'

/**
 * This is used to infer the resolved type from user inputted schema
 */
type Infer<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['output']

// ---- path generation ----
// Recurses into plain objects only — Date/Array/Function are leaves

type Paths<T> = T extends Date | Array<unknown> | Function | null | undefined ? never : T extends object ? { [K in keyof T & string]: K | `${K}.${Paths<T[K]>}` }[keyof T & string] : never

// ---- can API ----

type Op<T> = {
      (fields: Paths<T>[]): void
      omit(fields: Paths<T>[]): void
}

interface Can<T> {
      read: Op<T>
      write: Op<T>
}

// ---- access callback ----

type AccessFn<T> = (can: Can<T>) => void

// ---- roles augmentation point ----

export interface Access {}

// ---- entity config ----

export interface EntityConfig<S extends StandardSchemaV1> {
      name: string
      guards?: unknown[]
      effects?: unknown[]
      model: S
}

// ---- internal helpers ----

// AromixRoles is {} here at compile time (augmented by the consumer).
// Keying into {} produces `never`, so we cast through Record for the runtime loop.
type RoleMap<T> = Record<string, (can: Can<T>) => void>

function makeOp<T>(): Op<T> {
      return Object.assign(
            (_fields: Paths<T>[]) => {
                  void _fields
            },
            {
                  omit(_fields: Paths<T>[]) {
                        void _fields
                  },
            },
      )
}

// ---- entity function ----

export function entity<S extends StandardSchemaV1>(config: EntityConfig<S>) {
      type T = Infer<S>

      return {
            access(map: { [K in keyof Access]: (can: Can<T>) => void }) {
                  void config
                  const can: Can<T> = { read: makeOp<T>(), write: makeOp<T>() }
                  for (const fn of Object.values(map as RoleMap<T>)) fn(can)
            },
      }
}
