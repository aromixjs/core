import { randomUUID } from 'node:crypto'
import { LogEvent, LogInput, MetricEvent, MetricInput, TraceEvent, TraceInput, TrackConfig } from './types'
import { HostCtx } from './context'
import { State } from './state'

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

	metric(input: MetricInput) {
		const event: MetricEvent = {
			id: randomUUID(),
			timestamp: Date.now(),
			name: input.name,
			value: input.value,
			attributes: {
				...HostCtx.getStore(),
				...input.attributes,
			},
		}
		State.pushMetric(event)
	},

	async time<T>(input: TraceInput<T>): Promise<T> {
		const startTime = Date.now()
		let status: 'ok' | 'error' = 'ok'

		try {
			return await input.run()
		} catch (err) {
			status = 'error'
			throw err
		} finally {
			const endTime = Date.now()

			const event: TraceEvent = {
				id: randomUUID(),
				startTime,
				endTime,
				durationMs: endTime - startTime,
				name: input.name,
				status,
				attributes: {
					...HostCtx.getStore(),
					...input.attributes,
				},
			}
			State.pushTrace(event)
		}
	},

	config(options: TrackConfig) {
		State.config(options)
	},
}
