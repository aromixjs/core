import { build } from "bun";
import { join } from "node:path";
import { $ } from "bun";

const packages = ["core", "bun", "cloudflare"];

for (const pkg of packages) {
  const pkgPath = join("packages", pkg);



  await build({
    entrypoints: [join(pkgPath, "src/index.ts")],
    outdir: join(pkgPath, "dist"),
    target: "bun",
    format: "esm",
    sourcemap: "none",
    external: ["@aromix/core", "@msgpack/msgpack"],
  });


  await $`bun x tsc --project packages/${pkg}/tsconfig.json`;
  await $`cd ${pkgPath} && bun link`;
}

console.log("Build complete.");