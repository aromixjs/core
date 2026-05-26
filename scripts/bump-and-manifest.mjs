import { execSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

execSync("npx beachball bump --yes", { stdio: "inherit" });

const packages = [];

for (const entry of readdirSync("packages", { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const pkgJson = join("packages", entry.name, "package.json");
  try {
    const diff = execSync(`git diff HEAD -- "${pkgJson}"`, { encoding: "utf8" });
    if (diff.includes('"version"')) {
      const { name, version } = JSON.parse(readFileSync(pkgJson, "utf8"));
      packages.push({ name, version });
    }
  } catch {
    // skip packages without a package.json
  }
}

writeFileSync(".bumped.json", JSON.stringify({ packages }, null, 2));
