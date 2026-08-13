export interface Unit {
	name: string
	start(): void | Promise<void>
	stop?(): void | Promise<void>
}


export function unit<T extends Unit>(def: T) {
	return def
}
