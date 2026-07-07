import { randomUUID } from 'crypto'
import { context, HostCtx } from './context'
import { LogEvent, LogInput, TrackConfig } from './types'
import { state } from './config'



export function log(input: LogInput) {
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

	for (const sink of state.immediateSinks) {
		sink.writeLogs([event]).catch((err) => console.error('[track]: sink failed', { cause: err }))
	}
	state.buffer.push(event)


}


export function config(options: Partial<TrackConfig>) {
	state.config(options)
	if (options.context) {
		context(options.context)
	}
}


export function flush() {
	return state.buffer.flush()
}