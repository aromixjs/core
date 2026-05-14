#!/usr/bin/env node

const [, , command] = process.argv;

switch (command) {
	case "build":
		import("./commands/build").then((m) => new m.Build().index());
		break;
	default:
		break;
}
