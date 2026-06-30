export interface GuardDef {
	name: string
	run(): void
}

export function guard(def: GuardDef) {
	return def
}
