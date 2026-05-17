import { DatabaseSync } from "node:sqlite";
import { Builder, getFields } from "./builder/sql/sql.builder";
import { FieldMeta, FieldType } from "./builder/sql/sql.types";

export type Storage = "sqlite";
export type Filter = Record<string, unknown | unknown[]>;
export type Row = Record<string, unknown>;
type SQLValue = null | number | bigint | string | Uint8Array;
export interface EntityOptions {
	name: string;
	storage: Storage;
	db: DatabaseSync;
	schema: (builder: Builder) => void;
}

export const $meta = Symbol("meta");

export interface EntitySymbols {
	[$meta]: { name: string; storage: Storage; fields: FieldMeta[] };
}

const SQL_TYPE: Record<FieldType, string> = {
	string: "TEXT",
	text: "TEXT",
	integer: "INTEGER",
	float: "REAL",
	boolean: "INTEGER",
	datetime: "TEXT",
	json: "TEXT",
};

class EntityBuilder {
	private buildWhere(filter: Filter): { clause: string; params: SQLValue[] } {
		const entries = Object.entries(filter);
		if (!entries.length) return { clause: "", params: [] };

		const parts: string[] = [];
		const params: SQLValue[] = [];

		for (const [col, val] of entries) {
			if (Array.isArray(val)) {
				parts.push(`"${col}" IN (${val.map(() => "?").join(", ")})`);
				params.push(...(val as SQLValue[]));
			} else {
				parts.push(`"${col}" = ?`);
				params.push(val as SQLValue);
			}
		}

		return { clause: `WHERE ${parts.join(" AND ")}`, params };
	}

	define(options: EntityOptions) {
		const builder = new Builder();
		options.schema(builder);
		const db = options.db;
		const fields = getFields(builder);

		const push = () => {
			const colDefs = fields
				.map((f) => {
					const parts: string[] = [`"${f.name}" ${SQL_TYPE[f.type]}`];
					if (f.primary) parts.push("PRIMARY KEY");
					if (f.notNullable) parts.push("NOT NULL");
					if (f.unique) parts.push("UNIQUE");
					if (f.default !== undefined) parts.push(`DEFAULT ${JSON.stringify(f.default)}`);
					return parts.join(" ");
				})
				.join(", ");

			db.exec(`CREATE TABLE IF NOT EXISTS "${options.name}" (${colDefs})`);
		};

		push();

		const pk = () => {
			const field = fields.find((f) => f.primary);
			if (!field) throw new Error(`Entity "${options.name}" has no primary key defined`);
			return field.name;
		};

		const buildWhere = this.buildWhere.bind(this);

		const self = {
			[$meta]: { name: options.name, storage: options.storage, fields },
			push,

			getAll(filter: Filter = {}): Row[] {
				const { clause, params } = buildWhere(filter);
				return db.prepare(`SELECT * FROM "${options.name}" ${clause}`).all(...params) as Row[];
			},

			getOne(filter: Filter): Row | null {
				const { clause, params } = buildWhere(filter);
				return (db.prepare(`SELECT * FROM "${options.name}" ${clause} LIMIT 1`).get(...params) as Row | null) ?? null;
			},

			insert(data: Row): Row {
				const cols = Object.keys(data)
					.map((c) => `"${c}"`)
					.join(", ");
				const slots = Object.keys(data)
					.map(() => "?")
					.join(", ");
				db.prepare(`INSERT INTO "${options.name}" (${cols}) VALUES (${slots})`).run(...(Object.values(data) as SQLValue[]));
				return data;
			},

			update(id: SQLValue, data: Row): Row {
				const sets = Object.keys(data)
					.map((c) => `"${c}" = ?`)
					.join(", ");
				db.prepare(`UPDATE "${options.name}" SET ${sets} WHERE "${pk()}" = ?`).run(
					...(Object.values(data) as SQLValue[]),
					id
				);
				return self.getOne({ [pk()]: id })!;
			},

			delete(id: SQLValue): void {
				db.prepare(`DELETE FROM "${options.name}" WHERE "${pk()}" = ?`).run(id);
			},

			count(filter: Filter = {}): number {
				const { clause, params } = buildWhere(filter);
				const row = db.prepare(`SELECT COUNT(*) as count FROM "${options.name}" ${clause}`).get(...params) as {
					count: number;
				};
				return row.count;
			},
		};

		return self;
	}
}

export function entity(options: EntityOptions) {
	return new EntityBuilder().define(options);
}
