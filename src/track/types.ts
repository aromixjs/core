export interface BufferOptions {
   flushIntervalMs: number
   maxBatchSize: number
}

export interface TrackConfig {
   console: boolean
   sqlite: string | false
   sinks: Sink[]
   buffer: BufferOptions
   context: Record<string, unknown>
}

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
   mode: 'immediate' | 'buffered'
   writeLogs(events: LogEvent[]): Promise<void>
}

