import { context } from './context'
import { LogEvent, MetricEvent, TraceEvent, TrackConfig } from './types'

export class State {
	static handlers: TrackConfig = {}

	static config(options: TrackConfig) {
		this.handlers = { ...this.handlers, ...options }
		if (options.context) {
			context(options.context)
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
