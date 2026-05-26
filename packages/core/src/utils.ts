// Remove Object Generics and show a resolved object in ide keeping the type clean
export type Prettify<TargetType> = { [Key in keyof TargetType]: TargetType[Key] } & {}

// Walks object keys recursively, producing all dot-joined paths. Returns never for primitives, null, undefined.
type WalkKeys<Input> = Input extends object ? { [Key in keyof Input & string]: Key | `${Key}.${CrushKeys<Input[Key]>}` }[keyof Input & string] : never

// Entry point: stops at arrays and Date, otherwise delegates to WalkKeys.
export type CrushKeys<Input> = Input extends unknown[] | Date ? never : WalkKeys<Input>

export class ObjectProcessor<ModelType> {
  constructor(private readonly data: ModelType) { }

  // Creates a new object with the specified keys removed, leaving the original untouched.
  omit<Keys extends keyof ModelType>(remove: Keys[]): Prettify<Omit<ModelType, Keys>> {
    const clone = Object.create(Object.getPrototypeOf(this.data))

    Object.assign(clone, this.data)

    for (const key of remove) {
      delete clone[key]
    }

    return clone
  }

  crushKeys() {
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

    walk(this.data, '')

    return keys as CrushKeys<ModelType>[]
  }
}
