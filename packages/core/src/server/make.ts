import type { ExtractOptions, PluginDef } from './plugin'


export interface App {

   register<Type extends PluginDef<undefined>>(provider: Type): void
   register<Type extends PluginDef<any>>(
      provider: Type,
      config: ExtractOptions<Type>,
   ): void


}

export function make(): App {
   const state = {}

   return {

      register(provider: any, config?: any) {
      },

      











   }
}
