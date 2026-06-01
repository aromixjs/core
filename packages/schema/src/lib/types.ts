export type AxType =
   | 'string'
   | 'number'
   | 'boolean'
   | 'bigint'
   | 'symbol'
   | 'null'
   | 'undefined'
   | 'unknown'
   | 'never'

export type AxTypeMap = {
   string: string
   number: number
   boolean: boolean
   bigint: bigint
   symbol: symbol
   null: null
   undefined: undefined
   unknown: unknown
   never: never
}

export type Meta = {
   type: AxType
   message: string | undefined
}