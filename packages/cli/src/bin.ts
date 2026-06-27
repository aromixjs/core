#!/usr/bin/env node

import { Generate } from './lib/generate'

const [, , command] = process.argv

switch (command) {
	case 'generate':
		await new Generate().index()

		break
	default:
		console.error(`Unknown command: ${command}`)
		console.error('Usage: aromix generate --link <host> [--output <path>]')
		break
}
