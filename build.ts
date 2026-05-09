import { build } from "bun";
import { join } from "node:path";
import { $ } from "bun";

const packages = ["core", "bun", "cloudflare"];

for (const pkg of packages) {

  await build({
    entrypoints: [join("packages", pkg, "src/index.ts")],
    outdir: join("packages", pkg, "dist"),
    target: "bun",
    format: "esm",
    sourcemap: "none",
    external: ["@aromix/core"],
  });


  await $`bun x tsc --project packages/${pkg}/tsconfig.json`;
}

console.log("Build complete.");