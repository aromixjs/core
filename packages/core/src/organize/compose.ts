import { AnySchema } from '@aromix/validator'
import { MongoEntity } from '../entity/platforms/mongo'
import { KvEntity } from '../entity/platforms/kv'
import { Descriptor } from './descriptor'

export interface ComposeInput {
	entities: Array<MongoEntity<AnySchema> | KvEntity<AnySchema>>
}

export function compose(input: ComposeInput) {
	const descriptors: any[] = []
	const des = new Descriptor()
	for (const entity of input.entities) {
		if (entity instanceof MongoEntity) descriptors.push(des.mongo(entity))
		if (entity instanceof KvEntity) descriptors.push(des.kv(entity))
	}

	return {
		get descriptor() {
			return { entities: descriptors }
		},
	}
}