export type GlobPattern = string | string[];

/**
 * Declares glob patterns for build-time resolution.
 * Returns an array of absolute file paths — resolved by the Aromix compiler.
 *
 * @example
 * load('@config/*')            // string[]
 * load(['@entity/*', './x/*']) // string[]
 */
export function load(pattern: GlobPattern): string[] {
	throw new Error(
		"load() is a build-time macro and must not be called at runtime. " +
			"Ensure your project is compiled with the Aromix build pipeline."
	);
}

// ---------------------------------------------------------------------------
// Global namespace — all Aromix compile-time macros live here.
// Add new macros as methods below when introduced.
// ---------------------------------------------------------------------------

declare global {
	namespace Aromix {
		/**
		 * Resolves glob patterns to absolute file paths at build time.
		 * @example
		 * Aromix.load('@config/*')
		 * Aromix.load(['@entity/*', './extra/*.ts'])
		 */
		function load(pattern: GlobPattern): string[];
	}
}
