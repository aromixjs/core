import { context, HostCtx, log } from './../src'
function main() {
	context({
		data: 123,
		test: 'ax',
		meta: import.meta,
	})

	log({
		name: 'mongo.connected',
		level: 'info',
		attributes: {
			from: import.meta.filename,
		},
	})

	log({
		name: 'mongo.connected',
		level: 'warn',
		attributes: {
			from: import.meta.filename,
		},
	})

	log({
		name: 'mongo.connected',
		level: 'error',
		attributes: {
			from: import.meta.filename,
		},
	})

	log({
		name: 'mongo.connected',
		level: 'debug',
		attributes: {
			from: import.meta.filename,
		},
	})
}

HostCtx.run({}, () => {
	main()
})
