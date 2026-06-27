import { Server } from "http";
import { ExtractOptions, ProviderInput } from "./provider";




export class Application extends Server {


   private constructor() {
      super()
   }



   static bootstrap() {
      // pass or take any config that might be useful
      return new Application()
   }


   register<Type extends ProviderInput<undefined>>(provider: Type): void
   register<Type extends ProviderInput<any>>(provider: Type, config: ExtractOptions<Type>): void
   register(provider: any, config?: any) {


   }













}