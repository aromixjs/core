declare global {
	namespace Aromix {
		type GlobPattern = string | string[];
		function load<T>(pattern: GlobPattern): T;
	}
}

export {};
