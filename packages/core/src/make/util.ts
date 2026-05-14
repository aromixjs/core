import { Hook } from "../hook/impl";

export function filter<T extends Hook["on"]>(hooks: Hook[], on: T) {
	return hooks.filter((h): h is Extract<Hook, { on: T }> => h.on === on).map((h) => h.run) as Extract<Hook, { on: T }>["run"][];
}
