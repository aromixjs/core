import { build } from "bun";
import { join } from "node:path";

const packages = ["core", "bun"];

for (const pkg of packages) {
  await build({
    entrypoints: [join("packages", pkg, "src/index.ts")],
    outdir: join("packages", pkg, "dist"),
    target: "bun",
    format: "esm",
    sourcemap: "none",
    external: ["@aromix/core"],
  });
}

console.log("Build complete.");
