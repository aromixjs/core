import { contextStorage, RawContext, ReplyValue } from "./request";

export type Next = () => Promise<ReplyValue>;

export type MiddlewareFn = (ctx: RawContext, next: Next) => Promise<ReplyValue>;

export interface Middleware {
  readonly name: string;
  readonly run: MiddlewareFn;
}

export async function runChain(
  chain: readonly Middleware[],
  ctx: RawContext,
  handler: (ctx: RawContext) => Promise<ReplyValue>,
): Promise<ReplyValue> {
  let index = 0;

  const next = (): Promise<ReplyValue> => {
    if (index < chain.length) {
      const mw = chain[index++];
      return mw.run(ctx, next);
    }
    return handler(ctx);
  };

  return contextStorage.run(ctx, next);
}
