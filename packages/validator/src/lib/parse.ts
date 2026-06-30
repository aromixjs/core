import { ax } from './ax'

const data = ax
	.object({
		name: ax.string().access({
			insert: ax.literals('users', 'admin'),
			update: ax.number().pipe((v) => String(v)),
		}),
	})
	.partial()

type i = typeof data.$insert

type b = typeof data.$base

type s = typeof data.$select

type u = typeof data.$update

console.log(data.state)
