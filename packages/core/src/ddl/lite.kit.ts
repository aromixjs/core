export namespace liteKit {

   export const $meta = Symbol.for('lite:meta')

   export interface Meta { }

   export type ColType = 'int' | 'real' | 'text' | 'blob' | 'boolean' | 'bigint' | 'date'

   export type DateFormat = 'iso' | 'unix-ms'

   export interface ColTypeMap {
      int: number
      real: number
      text: string
      blob: Uint8Array
      boolean: boolean
      bigint: bigint
      date: Date
   }

   export interface Input {
      type: ColType
      dateFormat?: DateFormat
   }


}