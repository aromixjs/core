import { Server } from 'http'
import { MaybePromise } from '../global'

export interface Builder {
	name: string
	preprocess?(ctx: object): MaybePromise<void>
	start?(server: Server): MaybePromise<void>
	stop?(): MaybePromise<void>
}

export function Builder(def: Builder) {
	return def
}
