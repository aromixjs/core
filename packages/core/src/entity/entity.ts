import { Builder } from "./builder";

interface Entity {
	schema: (builder: Builder) => void;
}

export function entity(options: Entity) {}
