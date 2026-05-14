import { StandardSchemaV1 } from "@standard-schema/spec";
import { Hook } from "../hook/impl";

export const programMeta = Symbol("aromix.program.meta");
export type ProgramMeta = typeof programMeta;

// --- Command ---

export interface CommandOptions<Input, Output, Deps> {
	name: string;
	input?: StandardSchemaV1<Input>;
	output?: StandardSchemaV1<Output>;
	hooks?: Hook[]; // Added hooks property
	run(input: Input, deps: Deps): Output | Promise<Output>;
}

// --- Stream ---

export interface Stream<Events> {
	emit<E extends keyof Events>(event: E, data: Events[E]): void;
	/**
	 * Closes the stream.
	 */
	close(): void;
}

export interface StreamOptions<Input, Events, Deps> {
	name: string;
	input?: StandardSchemaV1<Input>;
	events?: StandardSchemaV1<Events>;
	hooks?: Hook[]; // Added hooks property
	run(input: Input, stream: Stream<Events>, deps: Deps): void | Promise<void>;
}

// --- Socket ---

export interface Socket<Receive, Send> {
	on<E extends keyof Receive>(event: E, handler: (data: Receive[E]) => void | Promise<void>): void;
	emit<E extends keyof Send>(event: E, data: Send[E]): void;
	/**
	 * Closes the socket.
	 */
	close(): void;
}

export interface SocketOptions<Receive, Send, Deps> {
	name: string;
	receive?: StandardSchemaV1<Receive>;
	send?: StandardSchemaV1<Send>;
	hooks?: Hook[]; // Added hooks property
	run(socket: Socket<Receive, Send>, deps: Deps): void | Promise<void>;
}

// --- Program & Routes ---

export type Route =
	| { type: "command"; options: CommandOptions<any, any, any> }
	| { type: "stream"; options: StreamOptions<any, any, any> }
	| { type: "socket"; options: SocketOptions<any, any, any> };

export interface ProgramConfig<Deps> {
	name: string;
	deps?: Deps;
	hooks?: Hook[];
}

export interface Program<Deps = any> {
	[programMeta]: {
		name: string;
		deps: Deps;
		hooks: Hook[];
		routes: Route[];
	};

	command<Input = any, Output = any>(options: CommandOptions<Input, Output, Deps>): void;
	stream<Input = any, Events = any>(options: StreamOptions<Input, Events, Deps>): void;
	socket<Receive = any, Send = any>(options: SocketOptions<Receive, Send, Deps>): void;
}
