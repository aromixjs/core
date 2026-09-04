import { ProgramLifeCycle } from './lifecycle'
import { Unit } from './unit'

class Program extends ProgramLifeCycle {
	private registeredUnits: Array<Unit> = []
	private startedUnits: Array<Unit> = []

	register(unit: Unit) {
		if (this.registeredUnits.some((u) => u.name === unit.name)) {
			throw new Error(`Unit "${unit.name}" is already registered.`)
		}

		this.registeredUnits.push(unit)
	}



	protected async onStart() {
		for (const unit of this.registeredUnits) {
			await unit.start()
			this.startedUnits.push(unit)
		}
	}



	protected async onStop() {
		for (let i = this.startedUnits.length - 1; i >= 0; i--) {
			const unit = this.startedUnits[i]

			try {
				await unit.stop?.()
			} catch (error) {
				console.error(`Failed to stop unit "${unit.name}".`, error)
			}
		}

		this.startedUnits = []
	}
}

export function program() {
	return new Program()
}
