import { StandardSchemaV1 } from "@standard-schema/spec";

export interface BaseCtx {
	id: string;
	payload: unknown;
	args<T>(schema: StandardSchemaV1<T>): T;
}

export interface CommandCtx extends BaseCtx {}
export interface StreamCtx extends BaseCtx {}

export interface SocketCtx<Receive extends EventMap, Send extends EventMap> extends BaseCtx {
	on<E extends keyof Receive>(event: E, handler: (data: Receive[E]) => void | Promise<void>): void;

	send<E extends keyof Send>(event: E, data: Send[E]): void;

	onClose(handler: () => void): void;

	close(): void;
}

export type EventMap = Record<string, unknown>;
