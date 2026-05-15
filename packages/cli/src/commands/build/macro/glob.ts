import { Dirent, readdirSync } from "node:fs";
import { resolve } from "node:path";
import micromatch from "micromatch";
import type { TsConfig } from "../types";

export class Glob {
	constructor(private tsConfig: TsConfig) {}

	/**
	 * Resolves a single pattern to a list of absolute file paths.
	 *
	 * Pipeline:
	 *   1. Alias substitution  — @entity/* → /abs/src/entities/*
	 *   2. Glob matching       — micromatch against all files under the base dir
	 */
	resolve(pattern: string, fromDir: string): string[] {
		const concretePatterns = this.resolveAlias(pattern);

		const seen = new Set<string>();
		for (const p of concretePatterns) {
			const baseDir = this.extractBaseDir(p);
			const files = this.listFilesRecursive(baseDir);
			const matched = micromatch(files, p);
			matched.forEach((f) => seen.add(f));
		}
		return [...seen];
	}

	/**
	 * Substitutes a tsconfig path alias with its concrete target paths.
	 * Returns the pattern unchanged if no alias matches.
	 *
	 * Example:
	 *   "@entity/*"  +  paths: { "@entity/*": ["/abs/src/entities/*"] }
	 *   → ["/abs/src/entities/*"]
	 */
	private resolveAlias(pattern: string): string[] {
		for (const [alias, targets] of Object.entries(this.tsConfig.paths)) {
			const rx = new RegExp("^" + alias.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "(.*)") + "$");
			const match = pattern.match(rx);
			if (!match) continue;

			const capture = match[1] ?? "";
			return targets.map((t) => (t.includes("*") ? t.replace("*", capture) : t));
		}

		return [pattern];
	}

	/**
	 * Extracts the static base directory from a glob pattern so we know
	 * which directory to enumerate before handing files to micromatch.
	 *
	 * "/abs/src/entities/*.entity.ts"  →  "/abs/src/entities"
	 * "/abs/src/entities/User.ts"      →  "/abs/src/entities"
	 */
	private extractBaseDir(pattern: string): string {
		const parts = pattern.split(/[/\\]/);
		const staticParts = parts.slice(
			0,
			parts.findIndex((p) => /[*?{]/.test(p))
		);
		return staticParts.length ? staticParts.join("/") : resolve(".");
	}

	/**
	 * Recursively lists all files under a directory as absolute paths.
	 * micromatch then filters this list against the glob pattern.
	 */
	private listFilesRecursive(dir: string): string[] {
		let entries: Dirent[];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return [];
		}

		const results: string[] = [];
		for (const entry of entries) {
			const full = `${dir}/${entry.name}`;
			if (entry.isDirectory()) results.push(...this.listFilesRecursive(full));
			else if (entry.isFile()) results.push(full);
		}
		return results;
	}
}
