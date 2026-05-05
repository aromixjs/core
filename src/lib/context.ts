export interface BaseCtx {
  id: string;
  args<T>(defaults: T): T;
}

export interface CommandCtx extends BaseCtx {}
