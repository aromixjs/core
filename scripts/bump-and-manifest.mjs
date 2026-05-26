import { execSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";

// Read all versions before bump
const before = {};
for (const dir of readdirSync("packages")) {
  try {
    const { name, version, private: priv } = JSON.parse(
      readFileSync(join("packages", dir, "package.json"), "utf8")
    );
    if (!priv) before[name] = version;
  } catch {}
}

// Beachball does the bumping
execSync("npx beachball bump --yes", { stdio: "inherit" });

// Find what changed
const bumped = [];
for (const dir of readdirSync("packages")) {
  try {
    const { name, version, private: priv } = JSON.parse(
      readFileSync(join("packages", dir, "package.json"), "utf8")
    );
    if (!priv && before[name] !== version) {
      bumped.push({ name, version });
    }
  } catch {}
}

writeFileSync(".bumped.json", JSON.stringify({ packages: bumped }, null, 2));
