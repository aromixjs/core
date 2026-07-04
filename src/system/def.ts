import { Loader, SystemState, Unit } from './types'

export function system() {
	const configLoaders: Loader<unknown>[] = []
	const unitLoaders: Loader<Unit>[] = []
	const units: Unit[] = []
	let state: SystemState = 'idle'

	function assertIdle(action: string) {
		if (state !== 'idle') {
			throw new Error(`[Aromix] Cannot ${action}: system is "${state}", expected "idle".`)
		}
	}

	function load(loader: Loader<unknown>) {
		assertIdle('add a config loader')
		configLoaders.push(loader)
	}

	function register(loader: Loader<Unit>) {
		assertIdle('register a unit')
		unitLoaders.push(loader)
	}

	async function stop() {
		if (state === 'stopped' || state === 'stopping') return
		state = 'stopping'

		for (let i = units.length - 1; i >= 0; i--) {
			try {
				await units[i].stop?.()
			} catch (err) {
				console.error(`[Aromix] "${units[i].name}" failed to stop`, err)
			}
		}

		state = 'stopped'
	}

	async function start() {
		assertIdle('start')
		state = 'loading'

		for (const loader of configLoaders) {
			await loader()
		}

		state = 'starting'

		for (const loader of unitLoaders) {
			const { default: unit } = await loader()

			if (units.some((u) => u.name === unit.name)) {
				throw new Error(`[Aromix] Unit with name "${unit.name}" is already registered.`)
			}

			try {
				await unit.start()
				units.push(unit)
			} catch (err) {
				await stop()
				throw new Error(`[Aromix] "${unit.name}" failed to start`, { cause: err })
			}
		}

		state = 'running'

		const onSignal = async () => {
			await stop()
			process.exit(0)
		}

		process.once('SIGINT', onSignal)
		process.once('SIGTERM', onSignal)
	}

	return {
		load,
		register,
		start,
		stop,
	}
}
