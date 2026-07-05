export type Loader<T> = () => Promise<{ default: T }>

export interface Unit {
	name: string
	start(): void | Promise<void>
	stop?(): void | Promise<void>
}
