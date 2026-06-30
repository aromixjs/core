export interface EffectDef {
	name: string
	run(): void
}

export function effect(def: EffectDef) {
	return def
}
