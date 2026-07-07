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



export interface TrackConfig {
   onLog?: (event: LogEvent) => void | Promise<void>
   context?: Record<string, unknown>
}
