export type GlobPattern = string | string[];

/**
 * Declares glob patterns for build-time resolution.
 * Returns an array of absolute file paths — resolved by the Aromix compiler.
 *
 * @example
 * load('@config/*')           // string[]
 * load(['@entity/*', './x/*']) // string[]
 */
export function load(pattern: GlobPattern): string[] {
	throw new Error(
		"load() is a build-time macro and must not be called at runtime. " +
			"Ensure your project is compiled with the Aromix build pipeline."
	);
}
