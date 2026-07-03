import { AxObjectSchema, AxSchemaShape } from '@aromix/validator'
import { resolve } from 'path'
import { Block } from '../app/builder.types'
import { existsSync } from 'fs'

export type LoadEnvOptions<Shape extends AxSchemaShape> = Partial<{
	path: string
	schema: AxObjectSchema<Shape>
}>

export function loadEnv<Shape extends AxSchemaShape>(options: LoadEnvOptions<Shape>): Block {
	const path = resolve(options.path ?? '.env')

	return {
		name: 'Load Env',
		async start() {
			if (!existsSync(path)) {
				throw new Error(`[Load Env]  Environment file not found: ${path}`)
			}

			process.loadEnvFile(path)

			if (options.schema) {
				const [result, issues] = options.schema.parseBase(process.env)



				if (issues) {
					throw new Error("[Load Env] Schema Validation Failed", {
						cause: issues
					});
				}
			}
		},


	}
}
