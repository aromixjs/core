import { randomUUID } from "node:crypto"
import { LogEvent, LogInput, TrackConfig } from "./types"
import { HostCtx } from "./context"
import { State } from "./state"


export const track = {
	log(input: LogInput) {
		const event: LogEvent = {
			id: randomUUID(),
			timestamp: Date.now(),
			name: input.name,
			level: input.level ?? 'info',
			attributes: {
				...HostCtx.getStore(),
				...input.attributes,
			},
		}

		State.pushLog(event)
	},


	config(options: TrackConfig) {
		State.config(options)
	},

}

