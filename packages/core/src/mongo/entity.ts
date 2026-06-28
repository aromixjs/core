import { AnySchema } from '@aromix/validator'
import { EffectDef } from '../layer/effect'
import { GuardDef } from '../layer/guard'

export interface MongoEntityDef<Type extends AnySchema> {
	name: string
	model: Type
	guards: GuardDef[]
	effects: EffectDef[]
}

export function MongoEntity<const Type extends AnySchema>(def: MongoEntityDef<Type>) {
	return def
}
