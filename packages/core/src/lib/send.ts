export type Send<T = unknown> = {
  data:   T | null
  errors: unknown[] | null
}

export function send<T>(payload: { data?: T; errors?: unknown[] }): Send<T> {
  return {
    data:   payload.data   ?? null,
    errors: payload.errors ?? null,
  }
}