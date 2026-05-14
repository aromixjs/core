import { inject, program, programMeta } from "@aromix/core";
import { ExtendedService } from "./service";
import * as v from "valibot";

const UserProgram = program({
	name: "User",
	deps: {
		extend: inject.facade(ExtendedService),
	},
});

const userInput = v.object({
	data: v.string(),
});

const eventsSchema = v.object({
	update: v.object({ id: v.string(), status: v.string() }),
	error: v.object({ message: v.string() }),
});

// 1. Command
UserProgram.command({
	name: "GetAll",
	input: userInput,
	output: v.array(v.string()),
	hooks: [],
	run(input, deps) {
		console.log("Command Run:", input);
		return ["user1", "user2"];
	},
});

// 2. Stream
UserProgram.stream({
	name: "WatchUpdates",
	input: v.object({ filter: v.string() }),
	events: eventsSchema,
	run(input, stream, deps) {
		stream.emit("update", { id: "1", status: "active" });
		stream.close();
	},
});

// 3. Socket
UserProgram.socket({
	name: "Chat",
	receive: v.object({ msg: v.string() }),
	send: v.object({ reply: v.string() }),
	run(socket, deps) {
		socket.on("msg", (data) => {
			socket.emit("reply", `Got: ${data}`);
		});
		socket.close();
	},
});

// Log the resolved meta object
console.log("--- Resolved Program Meta ---");
console.dir(UserProgram[programMeta], { depth: null });
