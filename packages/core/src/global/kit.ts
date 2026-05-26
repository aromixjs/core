import { Type } from './type'

/**
 * Global utility namespace.
 * Holds internal helper functions that are not bound to any specific feature.
 */
export namespace Kit {
      /**
       * Returns a shallow clone of `input` with the specified keys removed.
       * Preserves the prototype chain.
       */
      export function omit<Input, Keys extends keyof Input>(input: Input, remove: Keys[]) {
            const proto = Object.getPrototypeOf(input)
            const clone = Object.create(proto)
            Object.assign(clone, input)

            for (const key of remove) {
                  delete clone[key]
            }

            return clone as Type.Prettify<Omit<Input, Keys>>
      }

      /**
       * Walks an object recursively and returns all dot-joined key paths.
       * e.g. `{ a: { b: 1 } }` → `["a", "a.b"]`
       * Stops at arrays and non-plain objects.
       */
      export function crushKeys<Input>(input: Input) {
            const keys: string[] = []

            const walk = (value: unknown, prefix: string) => {
                  if (prefix) {
                        keys.push(prefix)
                  }

                  if (value !== null && typeof value === 'object' && value.constructor === Object) {
                        for (const [entryKey, entryValue] of Object.entries(value)) {
                              const path = prefix ? `${prefix}.${entryKey}` : entryKey

                              walk(entryValue, path)
                        }
                  }
            }

            walk(input, '')

            return keys as Type.CrushKeys<Input>[]
      }
}
