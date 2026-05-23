/**
 * resolves all generic and utility types into their final
 * plain object shape, making IDE hover info clean and readable.
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

export type Optional<T> = T | undefined;


export class Obj<T extends object> {

   constructor(private readonly data: T) { }

   /**
    * Creates a new object with the specified keys removed, leaving the original untouched.
    */
   omit<Keys extends keyof T>(remove: Keys[]): PrettifyObj<Omit<T, Keys>> {

      const clone = Object.create(Object.getPrototypeOf(this.data));
      Object.assign(clone, this.data);
      for (const key of remove) {
         delete clone[key];
      }
      return clone;
   };




}
