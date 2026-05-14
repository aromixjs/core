import { Hook } from "./type";

export { Hook };

export function hook<T extends Hook["on"]>(on: T, run: Extract<Hook, { on: T }>["run"]): Extract<Hook, { on: T }> {
	return { on, run } as Extract<Hook, { on: T }>;
}
