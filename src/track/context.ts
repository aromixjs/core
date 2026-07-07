import { AsyncLocalStorage } from 'node:async_hooks'

export const HostCtx = new AsyncLocalStorage<Record<string, unknown>>()

export function context(values: Record<string, unknown>) {
	HostCtx.enterWith({
		...HostCtx.getStore(),
		...values,
	})
}