import { AnySchema } from '@aromix/validator'
import { Builder } from '../server/builder'
import { loadEnvFile } from 'process'

export interface ValidateEnvConfig<Schema extends Record<string, AnySchema>> {
	path: string
	schema: Schema
	onError?(err: unknown): void
}

export function ValidateEnv<const Schema extends Record<string, AnySchema>>(config: ValidateEnvConfig<Schema>) {
	const builder = Builder({
		name: 'validate.env',
		onRegister(state) {
			loadEnvFile(config.path)
			console.log(state)
			console.log(process.env)
		},
	})

	function env<Key extends keyof Schema>(key: Key, fallback?: Schema[Key]['$base']): Schema[Key]['$base'] {
		return process.env[key as string] ?? fallback
	}

	return [builder, env] as const
}
