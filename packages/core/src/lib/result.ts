export type Ok<T> = { readonly ok: true; readonly data: T };
export type Err<E> = { readonly ok: false; readonly err: E; readonly cause?: unknown };
export type Result<T, E extends string = string> = Ok<T> | Err<E>;

export const pass = <T>(data: T): Ok<T> => Object.freeze({ ok: true as const, data });

export const fail = <E extends string>(e: E, cause?: unknown): Err<E> =>
  Object.freeze({ ok: false as const, err: e, ...(cause !== undefined && { cause }) });

export function tryRun<T>(fn: () => T): Result<T, "unexpected_error"> {
  try {
    return pass(fn());
  } catch (e) {
    return fail("unexpected_error", e);
  }
}

export async function tryRunAsync<T>(fn: () => Promise<T>): Promise<Result<T, "unexpected_error">> {
  try {
    return pass(await fn());
  } catch (e) {
    return fail("unexpected_error", e);
  }
}

export async function tryAll<T extends readonly unknown[]>(fns: { [K in keyof T]: () => Promise<T[K]> }): Promise<{
  [K in keyof T]: Result<T[K], "unexpected_error">;
}> {
  return Promise.all(
    fns.map(async (fn) => {
      try {
        return pass(await fn());
      } catch (e) {
        return fail("unexpected_error", e);
      }
    })
  ) as unknown as { [K in keyof T]: Result<T[K], "unexpected_error"> };
}
