import { Unit } from './unit'

class Program {
	private registeredUnits: Array<Unit> = []
	private startedUnits: Array<Unit> = []

	private running = false
	private stopping = false

	register(unit: Unit) {
		if (this.registeredUnits.some((u) => u.name === unit.name)) {
			throw new Error(`Unit "${unit.name}" is already registered.`)
		}

		this.registeredUnits.push(unit)
	}

	async start() {
		if (this.running) return
		try {
			for (const unit of this.registeredUnits) {
				await unit.start()
				this.startedUnits.push(unit)
			}

			this.running = true
			this.installSignalHandlers()
		} catch (error) {
			await this.stop()
			throw error
		}
	}

	async stop() {
		if (this.stopping || !this.startedUnits.length) return
		this.stopping = true

		try {
			for (let i = this.startedUnits.length - 1; i >= 0; i--) {
				const unit = this.startedUnits[i]

				try {
					await unit.stop?.()
				} catch (error) {
					console.error(`Failed to stop unit "${unit.name}".`, error)
				}
			}
		} finally {
			this.startedUnits = []
			this.running = false
			this.stopping = false
			this.removeSignalHandlers()
		}
	}

	private readonly onSignal = async () => {
		await this.stop()
		process.exit(0)
	}

	private installSignalHandlers() {
		process.once('SIGINT', this.onSignal)
		process.once('SIGTERM', this.onSignal)
	}

	private removeSignalHandlers() {
		process.off('SIGINT', this.onSignal)
		process.off('SIGTERM', this.onSignal)
	}
}

export function program() {
	return new Program()
}
