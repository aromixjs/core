export type PluginCtx = {
	
}

export interface PluginDef<Options = undefined> {
	name: string
	description: string
	setup(ctx: PluginCtx, options: Options): void | Promise<void>
}

export type ExtractOptions<T> = T extends PluginDef<infer O> ? O : never

export function plugin<Options = undefined>(input: PluginDef<Options>): PluginDef<Options> {
	return input
}
