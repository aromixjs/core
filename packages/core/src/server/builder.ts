import { Server } from 'http'
import { MaybePromise } from '../global'

export interface Builder {
	name: string
	onRegister?(state: Record<string, any>): MaybePromise<void>
	onListen?(server: Server): MaybePromise<void>
	onShutdown?(): MaybePromise<void>
}

export function Builder(def: Builder) {
	return def
}
