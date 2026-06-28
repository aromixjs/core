import { AnySchema } from '@aromix/validator'
import { MongoEntityDef } from './entity'
import { GuardDef } from '../layer/guard'
import { EffectDef } from '../layer/effect'

export interface MongoDatabaseDef {
	name: string
	entities: MongoEntityDef<AnySchema>[]
	guards: GuardDef[]
	effects: EffectDef[]
}

export function MongoDatabase(def: MongoDatabaseDef) {
	return def
}
