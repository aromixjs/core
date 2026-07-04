import type { Block, ErrorHandler, Phase } from './builder.types'

export class App {
	private isStarted = false
	private isStopping = false
	private blocks: Block[] = []
	private errorHandlers: ErrorHandler[] = []

	use(block: Block) {
		if (this.isStarted) {
			throw new Error(`[Aromix] Unable to register "${block.name}": process already started.`)
		}
		if (this.blocks.some((b) => b.name === block.name)) {
			throw new Error(`[Aromix] Block with name "${block.name}" is already registered.`)
		}

		this.blocks.push(block)
	}

	onError(handler: ErrorHandler) {
		this.errorHandlers.push(handler)
	}

	async start() {
		if (this.isStarted) {
			throw new Error('[Aromix] Process has already been started.')
		}

		this.isStarted = true

		for (const block of this.blocks) {
			const startedAt = Date.now()
			try {
				await block.start()
			} catch (err) {
				await this.notifyError(err, 'start', block)
				await this.stopAll('start-failure')
				process.exit(1)
			}
		}

		process.on('uncaughtException', (err) => {
			this.notifyError(err, 'runtime').finally(() => this.gracefulShutdown('uncaughtException'))
		})

		process.on('unhandledRejection', (reason) => {
			const err = reason instanceof Error ? reason : new Error(String(reason))
			this.notifyError(err, 'runtime').finally(() => this.gracefulShutdown('unhandledRejection'))
		})

		process.once('SIGINT', () => this.gracefulShutdown('SIGINT'))
		process.once('SIGTERM', () => this.gracefulShutdown('SIGTERM'))
	}

	async stop() {
		await this.stopAll('manual')
	}

	private async notifyError(err: unknown, phase: Phase | 'runtime', block?: Block): Promise<void> {
		const error = err instanceof Error ? err : new Error(String(err))

		if (block?.error && (phase === 'start' || phase === 'stop')) {
			await block.error(error, phase)

		}

		for (const handler of this.errorHandlers) {
			await handler(error, phase)
		}
	}

	private async stopAll(reason: string): Promise<boolean> {
		if (this.isStopping) return true
		this.isStopping = true

		let allStoppedCleanly = true

		for (let i = this.blocks.length - 1; i >= 0; i--) {
			const block = this.blocks[i]
			const startedAt = Date.now()
			try {
				await block.stop?.()
			} catch (err) {
				allStoppedCleanly = false
				await this.notifyError(err, 'stop', block)
			}
		}

		return allStoppedCleanly
	}

	private async gracefulShutdown(signal: string): Promise<void> {
		const clean = await this.stopAll(signal)
		process.exit(clean ? 0 : 1)
	}
}
