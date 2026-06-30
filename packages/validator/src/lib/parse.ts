import { AnySchema } from './types'

export function TypeOf(value: any) {
	if (Array.isArray(value)) {
		return 'array'
	} else {
		return typeof value
	}
}

export function ParseBase<Schema extends AnySchema>(schema: Schema, data: unknown) {
	const { type, meta } = schema.state

	const errs: object[] = []
	let result: any

	const received = TypeOf(data)
	switch (type) {
		case 'string': {
			if (typeof data === 'string') {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected string But Received ' + received,
					expected: 'string',
					received,
				})
			}
			break
		}

		case 'number': {
			if (typeof data === 'number') {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected number But Received ' + received,
					expected: 'number',
					received,
				})
			}
			break
		}

		case 'boolean': {
			if (typeof data === 'boolean') {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected boolean But Received ' + received,
					expected: 'boolean',
					received,
				})
			}
			break
		}

		case 'bigInt': {
			if (typeof data === 'bigint') {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected bigint But Received ' + received,
					expected: 'bigint',
					received,
				})
			}
			break
		}

		case 'symbol': {
			if (typeof data === 'symbol') {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected symbol But Received ' + received,
					expected: 'symbol',
					received,
				})
			}
			break
		}

		case 'null': {
			if (data === null) {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected null But Received ' + received,
					expected: 'null',
					received,
				})
			}
			break
		}

		case 'undefined': {
			if (data === undefined) {
				result = data
			} else {
				errs.push({
					code: 'InvalidType',
					message: 'Expected undefined But Received ' + received,
					expected: 'undefined',
					received,
				})
			}
			break
		}

		case 'unknown': {
			result = data
			break
		}

		case 'never': {
			errs.push({
				code: 'InvalidType',
				message: 'Expected never But Received ' + received,
				expected: 'never',
				received,
			})
			break
		}
	}

	return [result, errs] as const
}
