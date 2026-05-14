import { Program, ProgramConfig, programMeta } from "./types";

/**
 * Creates a new Aromix Program.
 * Programs group commands, streams, and sockets under a common namespace
 * and share dependencies and hooks.
 */
export function program<Deps>(config: ProgramConfig<Deps>): Program<Deps> {
	const meta: Program<Deps>[typeof programMeta] = {
		name: config.name,
		deps: config.deps ?? ({} as Deps),
		hooks: config.hooks ?? [],
		routes: [],
	};

	return {
		[programMeta]: meta,

		command(options) {
			meta.routes.push({
				type: "command",
				options,
			});
		},

		stream(options) {
			meta.routes.push({
				type: "stream",
				options,
			});
		},

		socket(options) {
			meta.routes.push({
				type: "socket",
				options,
			});
		},
	};
}
