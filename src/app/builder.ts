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
		console.debug('[Aromix] Block registered', { block: block.name, phase: 'register' })
	}

	onError(handler: ErrorHandler): this {
		this.errorHandlers.push(handler)
		return this
	}

	async start() {
		if (this.isStarted) {
			throw new Error('[Aromix] Process has already been started.')
		}
		this.isStarted = true
		console.info('[Aromix] Starting application', { totalBlocks: this.blocks.length })

		for (const block of this.blocks) {
			const startedAt = Date.now()
			try {
				await block.start()
				console.log('[Aromix] Block started', { block: block.name, phase: 'start', durationMs: Date.now() - startedAt })
			} catch (err) {
				console.error('[Aromix] Fatal: block failed to start. Rolling back...', err, { block: block.name, phase: 'start' })
				await this.notifyError(err, 'start', block)
				await this.stopAll('start-failure')
				process.exit(1)
			}
		}

		process.on('uncaughtException', (err) => {
			console.error('[Aromix] Uncaught exception. Shutting down...', err)
			this.notifyError(err, 'runtime').finally(() => this.gracefulShutdown('uncaughtException'))
		})

		process.on('unhandledRejection', (reason) => {
			const err = reason instanceof Error ? reason : new Error(String(reason))
			console.error('[Aromix] Unhandled rejection. Shutting down...', err)
			this.notifyError(err, 'runtime').finally(() => this.gracefulShutdown('unhandledRejection'))
		})

		process.once('SIGINT', () => this.gracefulShutdown('SIGINT'))
		process.once('SIGTERM', () => this.gracefulShutdown('SIGTERM'))

		console.log('[Aromix] Application started successfully', { totalBlocks: this.blocks.length })
	}

	async stop() {
		await this.stopAll('manual')
	}

	private async notifyError(err: unknown, phase: Phase | 'runtime', block?: Block): Promise<void> {
		const error = err instanceof Error ? err : new Error(String(err))

		if (block?.error && (phase === 'start' || phase === 'stop')) {
			try {
				await block.error(error, phase)
			} catch (handlerErr) {
				console.error(`[Aromix] Block "${block.name}" error handler itself threw`, handlerErr, { block: block.name, phase })
			}
		}

		for (const handler of this.errorHandlers) {
			try {
				await handler(error, phase)
			} catch (handlerErr) {
				console.error('[Aromix] Global error handler threw', handlerErr, { phase })
			}
		}
	}

	private async stopAll(reason: string): Promise<boolean> {
		if (this.isStopping) return true
		this.isStopping = true
		console.info('[Aromix] Stopping all blocks', { phase: 'stop', signal: reason, totalBlocks: this.blocks.length })

		let allStoppedCleanly = true

		for (let i = this.blocks.length - 1; i >= 0; i--) {
			const block = this.blocks[i]
			const startedAt = Date.now()
			try {
				await block.stop?.()
				console.log('[Aromix] Block stopped', { block: block.name, phase: 'stop', durationMs: Date.now() - startedAt })
			} catch (err) {
				allStoppedCleanly = false
				console.error('[Aromix] Block failed to stop', err, { block: block.name, phase: 'stop' })
				await this.notifyError(err, 'stop', block)
			}
		}

		return allStoppedCleanly
	}

	private async gracefulShutdown(signal: string): Promise<void> {
		console.info(`[Aromix] Received ${signal}. Starting graceful shutdown...`, { signal })
		const clean = await this.stopAll(signal)
		process.exit(clean ? 0 : 1)
	}
}
