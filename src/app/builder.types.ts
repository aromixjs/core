export type Phase = 'start' | 'stop'

export interface Block {
	name: string
	start(): void | Promise<void>
	stop?(): void | Promise<void>
	error?(err: Error, phase: Phase): void | Promise<void>
}

export type ErrorHandler = (err: Error, phase: Phase | 'runtime') => void | Promise<void>
