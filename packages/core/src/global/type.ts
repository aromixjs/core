export namespace Type {
      /** Resolves a mapped/generic type into a plain object shape — improves IDE hover readability. */
      export type Prettify<TargetType> = { [Key in keyof TargetType]: TargetType[Key] } & {}

      /** Recursively walks object keys, producing all dot-joined paths. Returns `never` for primitives, null, and undefined. */
      type WalkKeys<Input> = Input extends object ? { [Key in keyof Input & string]: Key | `${Key}.${CrushKeys<Input[Key]>}` }[keyof Input & string] : never

      /** Returns all dot-joined key paths for a given object. Stops at arrays and `Date`. e.g. `{ a: { b: 1 } }` → `"a" | "a.b"` */
      export type CrushKeys<Input> = Input extends unknown[] | Date ? never : WalkKeys<Input>
}
