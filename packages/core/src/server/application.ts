import { Builder } from './builder'
class Application {
	private state = {}

	register(builder: Builder) {}

	listen() {}
}

export function bootstrap() {
	return new Application()
}
