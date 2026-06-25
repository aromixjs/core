#!/usr/bin/env node

const [, , command] = process.argv

switch (command) {
	case 'init':
		console.log('init');

		break

	case 'build':
		console.log('build');

		break

	default:
		break
}