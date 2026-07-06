import { randomUUID } from 'crypto'
import { HostCtx } from './context'
import { consoleSink } from './console.sink'

export interface LogEvent {
	id: string
	timestamp: number
	name: string
	level: 'debug' | 'info' | 'warn' | 'error'
	attributes?: Record<string, unknown>
}

export type LogInput = {
	name: string
} & Partial<{
	attributes: Record<string, unknown>
	level: LogEvent['level']
}>

export interface Sink {
	writeLogs(events: LogEvent[]): Promise<void>
}


const sinks: Sink[] = [consoleSink]

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



	for (const sink of sinks) {

		sink.writeLogs([event]).catch(err => console.error('[track]: sink failed', { cause: err }))
	}


}
