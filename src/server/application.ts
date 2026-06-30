import { Builder } from './builder'
import { createServer } from 'http'

class Application {
	private state: Record<string, any> = {}
	private builders: Builder[] = []

	register(builder: Builder) {
		this.builders.push(builder)
		builder.onRegister?.(this.state)
	}

	async listen(port: number) {
		const server = createServer()
		for (const builder of this.builders) {
			await builder.onListen?.(server)
		}
		server.listen(port)

		server.on('close', async () => {
			for (const builder of this.builders) {
				await builder.onShutdown?.()
			}
		})
	}
}
export function bootstrap() {
	return new Application()
}
