export function make() {
	// const { hooks: globalHooks = [], programs = [] } = makeConfig;
	// const routes: ResolvedApp['routes'] = new Map();
	// const onReady: ResolvedApp['onReady'] = [];
	// const onClose: ResolvedApp['onClose'] = [];
	// onReady.push(...filter(globalHooks, "Ready"));
	// onClose.push(...filter(globalHooks, "Close"));
	// for (const program of programs) {
	//    // const { programConfig, routes: programRoutes } = program[programMeta];
	//    // const programHooks = programConfig.hooks ?? [];
	//    onReady.push(...filter(programHooks, "Ready"));
	//    onClose.push(...filter(programHooks, "Close"));
	//    for (const route of programRoutes) {
	//       const key = `${programConfig.name}:${route.name}`;
	//       onReady.push(...filter(route.hooks, "Ready"));
	//       onClose.push(...filter(route.hooks, "Close"));
	//       routes.set(key, {
	//          key,
	//          type: route.type,
	//          handler: route.handler as any,
	//          onRequest: [
	//             ...filter(globalHooks, "Request"),
	//             ...filter(programHooks, "Request"),
	//             ...filter(route.hooks, "Request"),
	//          ],
	//          onResponse: [
	//             ...filter(route.hooks, "Response"),
	//             ...filter(programHooks, "Response"),
	//             ...filter(globalHooks, "Response"),
	//          ],
	//          onError: [
	//             ...filter(route.hooks, "Error"),
	//             ...filter(programHooks, "Error"),
	//             ...filter(globalHooks, "Error"),
	//          ],
	//       });
	//    }
	// }
	// return {
	//    routes,
	//    onReady,
	//    onClose,
	// };
}

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
