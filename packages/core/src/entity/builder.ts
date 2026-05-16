type FieldType = "string" | "integer" | "float" | "boolean" | "text" | "datetime" | "json";

interface FieldMeta {
	name: string;
	type: FieldType;
	nullable: boolean;
	primary: boolean;
	unique: boolean;
	default?: unknown;
}

// hidden storage:: [not accessible from outside this module]
const meta = new WeakMap<object, FieldMeta>();
const fields = new WeakMap<Builder, FieldMeta[]>();

// internal accessors:: [exported for use by entity/repository, not part of public API]
export const getMeta = (f: object): FieldMeta => meta.get(f)!;
export const getFields = (b: Builder): FieldMeta[] => fields.get(b)!;

// accumulates used method names and omits them from the next return type
type Next<TValue, TUsed extends string, TNew extends string> = Omit<FieldBuilderImpl<TValue, TUsed | TNew>, TUsed | TNew>;

class FieldBuilderImpl<TValue, TUsed extends string = never> {
	constructor(name: string, type: FieldType) {
		meta.set(this, { name, type, nullable: true, primary: false, unique: false });
	}

	primary(): Next<TValue, TUsed, "primary"> {
		getMeta(this).primary = true;
		return this as any;
	}
	notNullable(): Next<TValue, TUsed, "notNullable" | "nullable"> {
		getMeta(this).nullable = false;
		return this as any;
	}
	nullable(): Next<TValue, TUsed, "nullable" | "notNullable"> {
		getMeta(this).nullable = true;
		return this as any;
	}
	unique(): Next<TValue, TUsed, "unique"> {
		getMeta(this).unique = true;
		return this as any;
	}
	defaultTo(v: TValue): Next<TValue, TUsed, "defaultTo"> {
		getMeta(this).default = v;
		return this as any;
	}
}

export class Builder {
	constructor() {
		fields.set(this, []);
	}

	private add<T extends FieldBuilderImpl<any>>(f: T): T {
		fields.get(this)!.push(getMeta(f));
		return f;
	}

	string(name: string) {
		return this.add(new FieldBuilderImpl<string>(name, "string"));
	}
	text(name: string) {
		return this.add(new FieldBuilderImpl<string>(name, "text"));
	}
	integer(name: string) {
		return this.add(new FieldBuilderImpl<number>(name, "integer"));
	}
	float(name: string) {
		return this.add(new FieldBuilderImpl<number>(name, "float"));
	}
	boolean(name: string) {
		return this.add(new FieldBuilderImpl<boolean>(name, "boolean"));
	}
	datetime(name: string) {
		return this.add(new FieldBuilderImpl<Date>(name, "datetime"));
	}
	json(name: string) {
		return this.add(new FieldBuilderImpl<unknown>(name, "json"));
	}

	timestamps() {
		const base = { nullable: false, primary: false, unique: false };
		fields.get(this)!.push({ ...base, name: "createdAt", type: "datetime" }, { ...base, name: "updatedAt", type: "datetime" });
	}
}
