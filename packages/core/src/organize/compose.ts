import type { AnySchema } from '@aromix/validator'
import { KvEntity } from '../entity/platforms/kv'
import { MongoEntity } from '../entity/platforms/mongo'
import { Descriptor } from './descriptor'

export interface ComposeInput {
	entities: Array<MongoEntity<AnySchema> | KvEntity<AnySchema>>
}

export function compose(input: ComposeInput) {
	const descriptors: any[] = []
	const routes = new Map<string, { entity: MongoEntity<AnySchema> | KvEntity<AnySchema>; methodName: string }>()

	const des = new Descriptor()

	for (const entity of input.entities) {
		if (entity instanceof MongoEntity) {
			const descriptor = des.mongo(entity)
			descriptors.push(descriptor)
			for (const method of descriptor.methods) {
				routes.set(method.route, { entity, methodName: method.name })
			}
		}
		if (entity instanceof KvEntity) {
			const descriptor = des.kv(entity)

			descriptors.push(descriptor)

			for (const method of descriptor.methods) {
				routes.set(method.route, { entity, methodName: method.name })
			}
		}
	}

	return {
		get descriptor() {
			return { entities: descriptors }
		},

		async dispatch(route: string, payload: unknown) {
			const target = routes.get(route)

			if (target === undefined) {
				throw new Error(`no method registered for route "${route}"`)
			}

			const fn = (target.entity as any)[target.methodName]
			return fn.call(target.entity, payload)
		},
	}
}
