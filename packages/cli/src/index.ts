#!/usr/bin/env node

const [, , command] = process.argv;

switch (command) {
	case "init":
		import("./commands/init/init").then((m) => new m.Init().run());
		break;

	case "build":
		import("./commands/build").then((m) => new m.Build().run());
		break;

	default:
		break;
}
