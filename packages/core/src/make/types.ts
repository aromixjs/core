// export interface MakeConfig {
//    programs?: Array<Program>,
//    hooks?: Array<Hook>,
// }

// type ResolvedRoute = {
//    key: string;
//    onRequest: Extract<Hook, { on: "Request" }>["run"][];
//    onResponse: Extract<Hook, { on: "Response" }>["run"][];
//    onError: Extract<Hook, { on: "Error" }>["run"][];
// } & (
//       | { type: 'command'; handler: CommandHandler }
//       | { type: 'stream'; handler: () => Emitter }
//       | { type: 'socket'; handler: SocketHandler }
//    );

// export interface ResolvedApp {
//    routes: Map<string, ResolvedRoute>;
//    onReady: Extract<Hook, { on: "Ready" }>["run"][];
//    onClose: Extract<Hook, { on: "Close" }>["run"][];
// }

export {};
