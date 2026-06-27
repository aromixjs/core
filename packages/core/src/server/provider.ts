export interface ProviderCtx { }

export interface ProviderInput<Options = undefined> {
   name: string
   description: string
   setup(ctx: ProviderCtx, options: Options): void
}

export type ExtractOptions<T> = T extends ProviderInput<infer O> ? O : never



export function provider<Options = undefined>(
   input: ProviderInput<Options>
): ProviderInput<Options> {
   return input
}