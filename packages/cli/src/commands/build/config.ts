import { AromixBuildConfig } from "@aromix/core";
import esbuild from "esbuild";
import { existsSync, unlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export class Config {
	constructor(private root: string) {}

	readonly ConfigFileName = ["aromix.build.ts", "aromix.build.js", "aromix.build.mjs"] as const;

	async buildConfig(): Promise<AromixBuildConfig> {
		const configPath = this.ConfigFileName.map((file) => join(this.root, file)).find(existsSync);

		if (!configPath) throw new Error(`No aromix.build.ts found in ${this.root}`);

		const tmp = join(this.root, ".aromix", "build", `tmp.${Date.now()}.mjs`);

		try {
			await esbuild.build({
				entryPoints: [configPath],
				outfile: tmp,
				bundle: true,
				format: "esm",
				platform: "node",
				packages: "external",
				write: true,
			});

			const mod = await import(pathToFileURL(tmp).href);
			console.log(`Loaded config from ${relative(this.root, configPath)}`);
			return mod.default as AromixBuildConfig;
		} finally {
			if (existsSync(tmp)) unlinkSync(tmp);
		}
	}
}
