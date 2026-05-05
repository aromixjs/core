export interface BaseCtx {
  id: string;
  payload: unknown
}

export interface CommandCtx extends BaseCtx { }
