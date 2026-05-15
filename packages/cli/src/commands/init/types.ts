import { Format, Platform } from "@aromix/core";

export type PackageManager = "npm" | "bun" | "pnpm" | "yarn";


export interface Answers {
  name: string;
  platform: Platform;
  format: Format;
  packageManager: PackageManager;
}

