/* 
Builders are the core primitive that participates directly in server building step 
These can add routes , add headers, run any arbitrary codes at different phases of the server lifecycle these should get the states and the full server instance
*/
export interface Builder {
   onPreprocess(): void
   onServerStart(): void
   onServerStop(): void
}
