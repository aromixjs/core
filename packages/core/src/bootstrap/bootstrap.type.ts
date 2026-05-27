import { ComposeConfig } from "../compose/compose.type";

export interface Bootstrap {
   (): void,
   compose(config: ComposeConfig): void
}


