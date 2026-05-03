export interface BaseCtx {
  id: string;
  args<T>(defaults: T): T;
}

export interface CommandCtx extends BaseCtx {}
export interface StreamCtx extends BaseCtx {}

export interface SocketCtx extends BaseCtx {
  on<T>(event: string, handler: (data: T) => void): void;
  broadcast<T>(data: T): void;
}
