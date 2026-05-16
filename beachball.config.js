/** @type {import('beachball').BeachballConfig} */
module.exports = {
  access: "public",
  registry: "https://registry.npmjs.org",
  gitTags: true,
  tag: "latest",
  ignorePatterns: [
    "playground/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/CHANGELOG.md",
    "**/dist/**",
  ],
  changelog: {
    groups: [
      {
        masterPackageName: "@aromix/core",
        changelogPath: "packages/core",
        include: ["packages/core/**"],
      },
      {
        masterPackageName: "@aromix/cli",
        changelogPath: "packages/cli",
        include: ["packages/cli/**"],
      },
      {
        masterPackageName: "@aromix/bun",
        changelogPath: "packages/bun",
        include: ["packages/bun/**"],
      },
      {
        masterPackageName: "@aromix/cloudflare",
        changelogPath: "packages/cloudflare",
        include: ["packages/cloudflare/**"],
      },
    ],
  },
};