export interface LogEvent {
	id: string
	timestamp: number
	name: string
	level: 'debug' | 'info' | 'warn' | 'error'
	attributes?: Record<string, unknown>
}

export interface LogInput {
	name: string
	level?: LogEvent['level']
	attributes?: Record<string, unknown>
}

export interface MetricEvent {
	id: string
	timestamp: number
	name: string
	value: number
	attributes?: Record<string, unknown>
}

export interface MetricInput {
	name: string
	value: number
	attributes?: Record<string, unknown>
}

export interface TraceEvent {
	id: string
	startTime: number
	endTime: number
	durationMs: number
	name: string
	status: 'ok' | 'error'
	attributes?: Record<string, unknown>
}

export interface TraceInput<T = any> {
	name: string
	run: () => Promise<T> | T
	attributes?: Record<string, unknown>
}

export interface TrackConfig {
	onLog?: (event: LogEvent) => void | Promise<void>
	onMetric?: (event: MetricEvent) => void | Promise<void>
	onTrace?: (event: TraceEvent) => void | Promise<void>
	context?: Record<string, unknown>
}
