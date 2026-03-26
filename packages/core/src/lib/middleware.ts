import { RawRequest, requestStorage } from "./request";
import { ResponseBuilder } from "./response";

export type Next = () => Promise<ResponseBuilder>;

export type MiddlewareFn = (next: Next) => Promise<ResponseBuilder>;

export interface Middleware {
  readonly name: string;
  readonly run: MiddlewareFn;
}

export async function runChain(
  chain: readonly Middleware[],
  raw: RawRequest,
  handler: () => Promise<ResponseBuilder>,
): Promise<ResponseBuilder> {
  let index = 0;

  const next = (): Promise<ResponseBuilder> => {
    if (index < chain.length) {
      const mw = chain[index++];
      return mw.run(next);
    }
    return handler();
  };

  return requestStorage.run(raw, next);
}
