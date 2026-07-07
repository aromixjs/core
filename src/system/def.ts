import { Loader, Unit } from './types'

export function system() {
	const configLoaders: Loader<unknown>[] = []
	const unitLoaders: Loader<Unit>[] = []
	const units: Unit[] = []

	function load(loader: Loader<unknown>) {
		configLoaders.push(loader)
	}

	function register(loader: Loader<Unit>) {
		unitLoaders.push(loader)
	}

	async function stop() {
		// Stop in exact reverse order of successful startup.
		// If a unit's stop() throws, it bubbles up.
		// The unit is responsible for handling/logging its own teardown errors.
		for (let i = units.length - 1; i >= 0; i--) {
			await units[i].stop?.()
		}
	}

	async function start() {
		// 1. Run synchronous pre-flight configs
		for (const loader of configLoaders) {
			await loader()
		}

		// 2. Register and start units linearly
		for (const loader of unitLoaders) {
			const { default: unit } = await loader()

			if (units.some((u) => u.name === unit.name)) {
				throw new Error(`Unit with name "${unit.name}" is already registered.`)
			}

			try {
				await unit.start()
				units.push(unit)
			} catch (err) {
				// If a unit fails to start, roll back the ones that already started.
				// We don't log or wrap the error here. We just let the original error bubble up.
				await stop()
				throw err
			}
		}

		// 3. Wire OS signals for graceful shutdown
		const onSignal = async () => {
			await stop()
			process.exit(0)
		}
		process.once('SIGINT', onSignal)
		process.once('SIGTERM', onSignal)
	}

	return { load, register, start, stop }
}
