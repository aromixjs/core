export type Result<T, E extends string = string> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly err: E };

export const result = {
  pass<T>(data: T): Result<T, never> {
    return Object.freeze({ ok: true as const, data });
  },
  fail<E extends string>(err: E): Result<never, E> {
    return Object.freeze({ ok: false as const, err });
  },
};
