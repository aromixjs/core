import type { FieldMeta, FieldType } from "./sql.types";

const meta = new WeakMap<object, FieldMeta>();
const fields = new WeakMap<Builder, FieldMeta[]>();

export const getMeta = (f: object): FieldMeta => meta.get(f)!;
export const getFields = (b: Builder): FieldMeta[] => fields.get(b)!;

// narrow:: single place where the cast lives [methods just call this]
function narrow<T extends object, K extends keyof T>(self: T, omit: K[]): Omit<T, K> {
	return self as unknown as Omit<T, K>;
}

class FieldBuilder<TValue> {
	constructor(name: string, type: FieldType) {
		meta.set(this, { name, type, nullable: true, notNullable: false, primary: false, unique: false });
	}

	primary() {
		meta.get(this)!.primary = true;
		return narrow(this, ["primary"]);
	}

	notNullable() {
		const m = meta.get(this)!;
		m.nullable = false;
		m.notNullable = true;
		return narrow(this, ["notNullable", "nullable"]);
	}

	nullable() {
		const m = meta.get(this)!;
		m.nullable = true;
		m.notNullable = false;
		return narrow(this, ["nullable", "notNullable"]);
	}

	unique() {
		meta.get(this)!.unique = true;
		return narrow(this, ["unique"]);
	}

	defaultTo(v: TValue) {
		meta.get(this)!.default = v;
		return narrow(this, ["defaultTo"]);
	}
}

export class Builder {
	constructor() {
		fields.set(this, []);
	}

	private add<T extends FieldBuilder<any>>(f: T): T {
		fields.get(this)!.push(meta.get(f)!);
		return f;
	}

	string(name: string) {
		return this.add(new FieldBuilder<string>(name, "string"));
	}
	text(name: string) {
		return this.add(new FieldBuilder<string>(name, "text"));
	}
	integer(name: string) {
		return this.add(new FieldBuilder<number>(name, "integer"));
	}
	float(name: string) {
		return this.add(new FieldBuilder<number>(name, "float"));
	}
	boolean(name: string) {
		return this.add(new FieldBuilder<boolean>(name, "boolean"));
	}
	datetime(name: string) {
		return this.add(new FieldBuilder<Date>(name, "datetime"));
	}
	json(name: string) {
		return this.add(new FieldBuilder<unknown>(name, "json"));
	}
}
