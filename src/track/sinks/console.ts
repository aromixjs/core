import type { LogEvent, Sink } from '../log'

const colors = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	gray: '\x1b[90m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
}

const levelColor: Record<LogEvent['level'], string> = {
	debug: colors.gray,
	info: colors.cyan,
	warn: colors.yellow,
	error: colors.bold + colors.red,
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatTime(timestamp: number) {
	const d = new Date(timestamp)
	const month = monthNames[d.getMonth()]
	const day = String(d.getDate()).padStart(2, '0')
	const hh = String(d.getHours()).padStart(2, '0')
	const mm = String(d.getMinutes()).padStart(2, '0')
	const ss = String(d.getSeconds()).padStart(2, '0')

	return `${month} ${day} ${hh}:${mm}:${ss}`
}

function jsonReplacer(key: string, value: unknown) {
	if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`
	return value
}


function formatAttributes(attributes: Record<string, unknown>): string {
	if (!Object.keys(attributes).length) return ''

	const json = JSON.stringify(attributes, jsonReplacer, 2)
	const indented = json
		.split('\n')
		.map((line) => `  ${line}`)
		.join('\n')

	return `\n${colors.gray}${colors.dim}${indented}${colors.reset}`
}


function formatLog(event: LogEvent): string {
	const time = `${colors.blue}${formatTime(event.timestamp)}${colors.reset}`
	const level = `${levelColor[event.level]}${event.level.toUpperCase().padEnd(5)}${colors.reset}`
	const name = `${colors.bold}${event.name}${colors.reset}`
	const attr = event.attributes ? formatAttributes(event.attributes) : ''

	return `${time} ${level} ${name}${attr}`
}

export const consoleSink: Sink = {
	async writeLogs(events) {
		for (const event of events) {
			const line = formatLog(event)
			console.log(line)
		}
	},
}
