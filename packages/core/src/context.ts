import { StandardSchemaV1 } from "@standard-schema/spec";

export interface BaseCtx {
  id: string;
}
export interface CommandCtx extends BaseCtx {
  /**
   * Decode and validate the incoming msgpack payload.
   * Throws if validation fails.
   */
  args<T>(schema: StandardSchemaV1<T>): T;

  /**
   * Raw decoded payload — use args() instead when you have a schema.
   */
  payload: unknown;
}


export interface StreamCtx extends BaseCtx {
  /** Same as command — one input payload to start the stream */
  args<T>(schema: StandardSchemaV1<T>): T;
  payload: unknown;
}



export interface SocketCtx<
  Receive extends EventMap,
  Send extends EventMap,
> extends BaseCtx {

  /**
   * Register a handler for an incoming client event.
   */
  on<E extends keyof Receive>(
    event: E,
    handler: (data: Receive[E]) => void | Promise<void>
  ): void;

  /**
   * Send an event to this specific client.
   */
  send<E extends keyof Send>(event: E, data: Send[E]): void;

  /**
   * Send an event to all connected clients on this socket name.
   * Implemented by the adapter — core defines the interface.
   */
  broadcast<E extends keyof Send>(event: E, data: Send[E]): void;

  /**
   * Fires when this connection closes.
   */
  onClose(handler: () => void): void;

  /**
   * Manually close this connection.
   */
  close(): void;
}

export type EventMap = Record<string, unknown>;