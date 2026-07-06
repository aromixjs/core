import pc from 'picocolors'
import { LogEvent, Sink } from './log'
import { inspect } from 'util'

const levelStyle: Record<LogEvent['level'], (s: string) => string> = {
	debug: pc.gray,
	info: pc.cyan,
	warn: pc.yellow,
	error: (s) => pc.bold(pc.red(s)),
}

function formatLog(event: LogEvent): string {
	const date = new Date(event.timestamp).toISOString().slice(11, 23)
	const time = pc.dim(date)

	const formattedLevel = event.level.toUpperCase().padEnd(5)
	const level = levelStyle[event.level](formattedLevel)

	let attr = ''

	if (event.attributes && Object.keys(event.attributes).length) {
		attr =
			' ' +
			inspect(event.attributes, {
				colors: true,
				depth: null,
				compact: true,
			})
	}

	return `${time} ${level} ${event.name}${attr}`
}

export const consoleSink: Sink = {
	async writeLogs(events) {
		for (const event of events) {
			const line = formatLog(event)
				console.log(line)
			
		}
	},
}
