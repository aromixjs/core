export type FieldType = "string" | "integer" | "float" | "boolean" | "text" | "datetime" | "json";

export interface FieldMeta {
	name: string;
	type: FieldType;
	nullable: boolean;
	notNullable: boolean;
	primary: boolean;
	unique: boolean;
	default?: unknown;
}
