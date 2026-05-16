import { AromixBuildConfig } from "@aromix/core";
import type esbuild from "esbuild";
import { readFileSync } from "fs";
import { dirname } from "path";
import { MacroFinder } from "./macro.finder";
import { TsConfigJson } from "get-tsconfig";
import { ResolvedBuildOptions } from "./types";

// Context passed to every macro's run()
export interface MacroRunContext<TInput = unknown[]> {
	input: TInput;
	filePath: string;
	fileDir: string;
	root: string;
	buildConfig: AromixBuildConfig;
	tsConfigPath: string;
	tsConfigDir: string;
	tsConfig: TsConfigJson;
}

export interface MacroDefinition<TInput = unknown[]> {
	name: string;
	input?: (args: unknown[]) => TInput;
	run: (ctx: MacroRunContext<TInput>) => string;
}

interface ResolverOptions {
	root: string;
	buildConfig: AromixBuildConfig;
	opts: ResolvedBuildOptions;
}

export class MacroResolver {
	private macros = new Map<string, MacroDefinition<any>>();
	private finder = new MacroFinder();

	constructor(private options: ResolverOptions) { }

	register<TInput>(definition: MacroDefinition<TInput>) {
		this.macros.set(definition.name, definition);
	}



	build(): esbuild.Plugin {
		return {
			name: "Aromix:Macros",
			setup: (build) => {
				build.onLoad({ filter: /\.[tj]sx?$/ }, (args) => {

					const src = readFileSync(args.path, "utf8");

					if (!src.includes("Aromix.")) return undefined;

					const calls = this.finder.find(src, args.path);
					if (calls.length === 0) return undefined;

					for (const call of calls) {
						if (!this.macros.has(call.macro)) {
							throw new Error(
								`Unknown Macro: Aromix.${call.macro}\n` +
								` At: ${args.path}:${call.line}\n`,
							);
						}
					}


					const { opts } = this.options;
					let result = src;

					for (const call of calls.sort((a, b) => b.start - a.start)) {
						const macro = this.macros.get(call.macro)!;

						const ctx: MacroRunContext = {
							input: macro.input ? macro.input(call.args) : call.args,
							filePath: args.path,
							fileDir: dirname(args.path),
							root: this.options.root,
							buildConfig: this.options.buildConfig,
							tsConfigPath: opts.tsConfigPath,
							tsConfigDir: opts.tsConfigDir,
							tsConfig: opts.tsConfig,
						};

						result =
							result.slice(0, call.start) +
							macro.run(ctx) +
							result.slice(call.end);
					}

					return { contents: result, loader: this.inferLoader(args.path) };
				});
			},
		};
	}

	private inferLoader(filePath: string): esbuild.Loader {
		if (filePath.endsWith(".tsx")) return "tsx";
		if (filePath.endsWith(".ts")) return "ts";
		if (filePath.endsWith(".jsx")) return "jsx";
		return "js";
	}
}
