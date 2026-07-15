import { randomUUID } from 'node:crypto'
import { LogEvent, LogInput, MetricEvent, MetricInput, TraceEvent, TraceInput, TrackConfig } from './types'
import { AsyncLocalStorage } from 'node:async_hooks'

export const AttributeContext = new AsyncLocalStorage<Record<string, unknown>>()
export class State {
	static handlers: TrackConfig = {}

	static config(options: TrackConfig) {
		this.handlers = { ...this.handlers, ...options }
		if (options.context) {
			AttributeContext.enterWith({
				...AttributeContext.getStore(),
				...options.context,
			})
		}
	}

	static pushLog(event: LogEvent) {
		if (this.handlers.onLog) {
			Promise.resolve(this.handlers.onLog(event)).catch((err) => {
				console.error('[track]: onLog handler failed', err)
			})
		}
	}

	static pushMetric(event: MetricEvent) {
		if (this.handlers.onMetric) {
			Promise.resolve(this.handlers.onMetric(event)).catch((err) => {
				console.error('[track]: onMetric handler failed', err)
			})
		}
	}

	static pushTrace(event: TraceEvent) {
		if (this.handlers.onTrace) {
			Promise.resolve(this.handlers.onTrace(event)).catch((err) => {
				console.error('[track]: onTrace handler failed', err)
			})
		}
	}
}






export const track = {
	log(input: LogInput) {
		const event: LogEvent = {
			id: randomUUID(),
			timestamp: Date.now(),
			name: input.name,
			level: input.level ?? 'info',
			attributes: {
				...AttributeContext.getStore(),
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
				...AttributeContext.getStore(),
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
					...AttributeContext.getStore(),
					...input.attributes,
				},
			}
			State.pushTrace(event)
		}
	},

	config(options: TrackConfig) {
		State.config(options)
	},

	context: AttributeContext,
	setContext: (values: Record<string, unknown>) => {
		AttributeContext.enterWith({
			...AttributeContext.getStore(),
			...values,
		})
	},
}
