import { execSync } from "child_process";
import { appendFileSync, readFileSync, writeFileSync } from "fs";

const packageList = [
  { name: "@aromix/core", file: "packages/core/package.json" },
  { name: "@aromix/bun", file: "packages/bun/package.json" },
  { name: "@aromix/cloudflare", file: "packages/cloudflare/package.json" },
  { name: "@aromix/cli", file: "packages/cli/package.json" },
];

const before = {};

for (const entry of packageList) {
  const { version } = JSON.parse(readFileSync(entry.file, "utf8"));

  before[entry.name] = version;
}

execSync("npx beachball bump --yes", { stdio: "inherit" });

const bumped = [];

for (const entry of packageList) {
  const { version } = JSON.parse(readFileSync(entry.file, "utf8"));

  if (before[entry.name] !== version) {
    bumped.push({ name: entry.name, version });
  }
}

const manifest = bumped.map(entry => `${entry.name} ${entry.version}`).join("\n");

writeFileSync(".bumped", manifest);

appendFileSync(process.env.GITHUB_OUTPUT, `has-bumped=${bumped.length > 0}\n`);
