import fg from "fast-glob";
import { relative, resolve } from "node:path";
import type { MacroDefinition } from "../macro.resolver";

function resolveAlias(pattern: string, paths: Record<string, string[]>, tsConfigDir: string): string | null {
	for (const [alias, targets] of Object.entries(paths)) {
		const aliasBase = alias.endsWith("/*") ? alias.slice(0, -2) : alias;
		if (!pattern.startsWith(aliasBase)) continue;

		const targetBase = targets[0].endsWith("/*") ? targets[0].slice(0, -2) : targets[0];

		const rest = pattern.slice(aliasBase.length);
		const absBase = resolve(tsConfigDir, targetBase).replace(/\\/g, "/");
		return absBase + rest;
	}

	return null;
}

export const loadMacro: MacroDefinition<string | string[]> = {
	name: "load",
	input: (args) => args[0] as string | string[],

	run(ctx) {
		const paths = ctx.tsConfig.compilerOptions?.paths ?? {};
		const patterns = Array.isArray(ctx.input) ? ctx.input : [ctx.input];

		const absolute = patterns
			.map((p) => resolveAlias(p, paths, ctx.tsConfigDir) ?? resolve(ctx.fileDir, p).replace(/\\/g, "/"))
			.flatMap((p) => fg.sync(p, { absolute: true, onlyFiles: true }));

		const imports = [...new Set(absolute)]
			.map((p) => {
				const rel = "./" + relative(ctx.fileDir, p).replace(/\\/g, "/");
				// Point to the transpiled output file, not the source
				const out = rel.replace(/\.tsx?$/, ".js");
				return `import(${JSON.stringify(out)})`;
			})
			.join(", ");

		return `(await Promise.all([${imports}]))`;
	},
};
