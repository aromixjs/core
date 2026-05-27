import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";

if (!existsSync(".bumped")) {
  console.log("No .bumped manifest found, skipping");
  process.exit(0);
}

const content = readFileSync(".bumped", "utf8");
const lines = content.trim().split("\n").filter(Boolean);

for (const line of lines) {
  const parts = line.split(" ");
  const name = parts[0];
  const version = parts[1];

  execSync(`pnpm --filter "${name}" build`, { stdio: "inherit" });

  try {
    execSync(`npm view "${name}@${version}" version`, { stdio: "pipe" });
    console.log(`✓ ${name}@${version} already published`);
  } catch {
    console.log(`→ Publishing ${name}@${version}...`);
    execSync(`pnpm --filter "${name}" publish --access public --no-git-checks`, {
      stdio: "inherit",
    });
  }
}
