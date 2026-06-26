#!/usr/bin/env node

import { Generate } from './lib/generate'

const [, , command] = process.argv

switch (command) {
	case 'init':
		console.log('init')

		break

	case 'build':
		console.log('build')

		break

	case 'generate':
		await new Generate().index()

		break
	default:
		break
}
