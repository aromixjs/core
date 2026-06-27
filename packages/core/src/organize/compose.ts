import type { AnySchema } from '@aromix/validator'
import { MongoEntity } from '../entity/platforms/mongo'
import { RedisEntity } from '../entity/platforms/redis'
import { Descriptor } from './descriptor'

export interface ComposeInput {
	entities: Array<MongoEntity<AnySchema> | RedisEntity<AnySchema>>
}

export function compose(input: ComposeInput) {
	const descriptors: any[] = []
	const routes = new Map<string, { entity: MongoEntity<AnySchema> | RedisEntity<AnySchema>; methodName: string }>()

	const des = new Descriptor()

	for (const entity of input.entities) {
		if (entity instanceof MongoEntity) {
			const descriptor = des.mongo(entity)
			descriptors.push(descriptor)
			for (const method of descriptor.methods) {
				routes.set(method.route, { entity, methodName: method.name })
			}
		}
		if (entity instanceof RedisEntity) {
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
