import { writeFileSync } from 'fs'

interface SchemaNode {
	type: string
	shape?: Record<string, SchemaNode>
	element?: SchemaNode
	items?: SchemaNode[]
	values?: unknown[]
}

interface MethodDescriptor {
	name: string
	route: string
	input: SchemaNode
	output: SchemaNode
}

interface EntityDescriptor {
	name: string
	platform: 'kv' | 'mongo'
	methods: MethodDescriptor[]
}

interface MetaDescriptor {
	entities: EntityDescriptor[]
}

export class Generate {
	async index() {
		const args = process.argv.slice(2)

		const linkIdx = args.indexOf('--link')
		const outputIdx = args.indexOf('--output')

		if (linkIdx === -1 || !args[linkIdx + 1]) {
			console.error('Error: --link <host> is required\n  Example: aromix generate --link localhost:3000')
			process.exit(1)
		}

		const link = args[linkIdx + 1]
		const output = outputIdx !== -1 && args[outputIdx + 1] ? args[outputIdx + 1] : './sdk.ts'

		const url = /^https?:\/\//.test(link) ? `${link}/meta` : `http://${link}/meta`

		console.log(`Fetching from ${url}...`)

		let descriptor: MetaDescriptor

		try {
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			descriptor = (await res.json()) as MetaDescriptor
		} catch (err) {
			console.error(`Failed to fetch descriptor: ${(err as Error).message}`)
			process.exit(1)
		}

		const code = this.generate(descriptor)
		writeFileSync(output, code, 'utf8')
		console.log(`SDK written to ${output}`)
	}

	private schemaToCode(node: SchemaNode, indent: number): string {
		const pad = '  '.repeat(indent)
		const inner = '  '.repeat(indent + 1)

		switch (node.type) {
			case 'string':    return 'ax.string()'
			case 'number':    return 'ax.number()'
			case 'boolean':   return 'ax.boolean()'
			case 'bigInt':    return 'ax.bigint()'
			case 'null':      return 'ax.null()'
			case 'undefined': return 'ax.undefined()'
			case 'unknown':   return 'ax.unknown()'
			case 'never':     return 'ax.never()'

			case 'object': {
				const shape = node.shape ?? {}
				const keys = Object.keys(shape)
				if (keys.length === 0) return 'ax.object({})'
				const fields = keys
					.map(k => `${inner}${k}: ${this.schemaToCode(shape[k], indent + 1)}`)
					.join(',\n')
				return `ax.object({\n${fields},\n${pad}})`
			}

			case 'array':
				return `ax.array(${this.schemaToCode(node.element!, indent)})`

			case 'tuple': {
				const items = (node.items ?? [])
					.map(s => `${inner}${this.schemaToCode(s, indent + 1)}`)
					.join(',\n')
				return `ax.tuple([\n${items},\n${pad}])`
			}

			case 'union': {
				const items = (node.items ?? [])
					.map(s => `${inner}${this.schemaToCode(s, indent + 1)}`)
					.join(',\n')
				return `ax.union([\n${items},\n${pad}])`
			}

			case 'record':
				return `ax.record(${this.schemaToCode(node.element!, indent)})`

			case 'literals': {
				const values = (node.values ?? []).map(v => JSON.stringify(v)).join(', ')
				return `ax.literals(${values})`
			}

			default:
				return 'ax.unknown()'
		}
	}

	private toCamelCase(name: string): string {
		return name.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
	}

	private generate(descriptor: MetaDescriptor): string {
		const lines: string[] = []

		lines.push(`import { ax } from '@aromix/validator'`)
		lines.push('')

		for (const entity of descriptor.entities) {
			const varName = `${this.toCamelCase(entity.name)}Entity`

			lines.push(`export const ${varName} = {`)
			lines.push(`  name: ${JSON.stringify(entity.name)},`)
			lines.push(`  platform: ${JSON.stringify(entity.platform)},`)
			lines.push(`  methods: {`)

			for (const method of entity.methods) {
				lines.push(`    ${method.name}: {`)
				lines.push(`      route: ${JSON.stringify(method.route)},`)
				lines.push(`      input: ${this.schemaToCode(method.input, 3)},`)
				lines.push(`      output: ${this.schemaToCode(method.output, 3)},`)
				lines.push(`    },`)
			}

			lines.push(`  },`)
			lines.push(`}`)
			lines.push('')
		}

		return lines.join('\n')
	}
}