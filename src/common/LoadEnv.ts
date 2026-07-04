import type { AxObjectSchema, AxSchemaShape } from '@aromix/validator'
import { existsSync } from 'fs'
import { resolve } from 'path'

export type LoadEnvOptions<Shape extends AxSchemaShape> = Partial<{
	path: string
	schema: AxObjectSchema<Shape>
}>

export function LoadEnv<Shape extends AxSchemaShape = AxSchemaShape>(
	options: Partial<{
		path: string
		schema: AxObjectSchema<Shape>
	}>,
) {
	const path = resolve(options.path ?? '.env')

	if (!existsSync(path)) {
		throw new Error(`[LoadEnv] Environment file not found: ${path}`)
	}

	process.loadEnvFile(path)

	let values: any = process.env

	if (options.schema) {
		const [result, issues] = options.schema.parseBase(process.env)
		if (issues) {
			console.error('[LoadEnv] Env Validation failed:')
			console.error(issues)
			process.exit(1)
		}
		values = result
	}

	function env<Key extends keyof Shape['base']>(key: Key): Shape['base'][Key] {
		return values[key]
	}

	return env
}
