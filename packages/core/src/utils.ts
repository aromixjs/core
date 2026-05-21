/**
 * Recursively resolves all generic and utility types into their final
 * plain object shape, making IDE hover info clean and readable.
 *
 * Useful when chaining multiple utility types (`Omit`, `Pick`, `Partial`, etc.)
 * and you want the IDE to show the final resolved keys instead of the
 * intermediate type expressions.
 *
 * @template T - The object type to prettify
 *
 * @example
 * // Without PrettifyObj — IDE shows:
 * Omit<Pick<User, "id" | "name" | "email">, "email">
 *
 * // With PrettifyObj — IDE shows:
 *  { id: number; name: string }
 *
 */
export type PrettifyObj<T> = { [K in keyof T]: T[K] } & {};





class Obj<T> {
   constructor(private readonly data: T) { }


   /**
    * Creates a new object with the specified keys removed, leaving the original untouched.
    */
   omit<Keys extends keyof T>(remove: readonly Keys[]): PrettifyObj<Omit<T, Keys>> {

      const clone = structuredClone(this.data)

      for (const key of remove) {

         delete clone[key]

      }
      return clone
      
   }



}



export function object<T>(data: T) {
   return new Obj(data)
}