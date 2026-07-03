import { App } from './../src'

const host = new App()

host.use({
	name: 'Test',
	start() {
		console.log('from block :: start Server')
	},
	stop() {
		console.log('from block :: Server Stopped')
	},
	error(err, phase) {
		console.log(err, phase)
	},
})

await host.start()
