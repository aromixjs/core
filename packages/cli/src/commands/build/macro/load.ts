import fg from "fast-glob";

import { MacroDefinition } from "../macro.resolver";
import { TsConfig } from "../types";

function resolveAlias(pattern: string, tsConfig: TsConfig): string[] {
	for (const [alias, targets] of Object.entries(tsConfig.paths)) {
		const star = alias.indexOf("*");

		if (star === -1) {
			if (pattern !== alias) continue;
			return targets;
		}

		const prefix = alias.slice(0, star);
		const suffix = alias.slice(star + 1);

		if (!pattern.startsWith(prefix)) continue;
		if (suffix && !pattern.endsWith(suffix)) continue;

		const capture = pattern.slice(prefix.length, suffix ? pattern.length - suffix.length : undefined);

		return targets.map((t) => (t.includes("*") ? t.replace("*", capture) : t));
	}

	return [pattern];
}

export const loadMacro: MacroDefinition<string | string[]> = {
	name: "load",
	input: (args) => args[0] as string | string[],

	run(ctx) {
		const patterns = Array.isArray(ctx.input) ? ctx.input : [ctx.input];

		const resolved = patterns
			.flatMap((p) => resolveAlias(p, ctx.tsConfig))
			.flatMap((p) => fg.sync(p, { absolute: true, onlyFiles: true }));

		return JSON.stringify([...new Set(resolved)]);
	},
};
