export interface Config {}

export function config<T extends Config>(config: T | (() => T)): T {
	return typeof config === "function" ? config() : config;
}
