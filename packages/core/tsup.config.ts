import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: { resolve: true },
	sourcemap: false,
	clean: true,
	splitting: true,
	minify: false,
	target: "es2022",
	outDir: "dist",
});
