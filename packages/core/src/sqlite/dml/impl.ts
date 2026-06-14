import { Schema } from "@aromix/validator";
import { SqliteAdapter } from "../adapter";
import { AxConverter } from "../converter/ax";
import { EntityInsert, EntitySelect, EntityUpdate, PaginateOptions, PaginateResult, SqliteEntityState, Where } from "../entity.types";

export class SqliteEntityDml<State> {
    private selectSchema: Schema<EntitySelect<State>>
    private insertSchema: Schema<EntityInsert<State>>
    private updateSchema: Schema<EntityUpdate<State>>

    constructor(
        private state: SqliteEntityState,
        private adapter: SqliteAdapter
    ) {
        this.selectSchema = AxConverter.select(this.state.columns)
        this.insertSchema = AxConverter.insert(this.state.columns)
        this.updateSchema = AxConverter.update(this.state.columns)
    }

    private get primaryKey(): { name: string; colType: string } | null {
        for (const [name, col] of Object.entries(this.state.columns)) {
            if (col.primaryKey) return { name, colType: col.colType }
        }
        return null
    }

    private escapeValue(value: unknown): string {
        if (value === null || value === undefined) return 'NULL'
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
        if (typeof value === 'number') return Number.isFinite(value) ? value.toString() : 'NULL'
        if (typeof value === 'boolean') return value ? '1' : '0'
        if (value instanceof Uint8Array) {
            let hex = ''
            for (let i = 0; i < value.length; i++) {
                hex += value[i].toString(16).padStart(2, '0')
            }
            return `X'${hex}'`
        }
        return `'${String(value)}'`
    }

    private buildWhereClause(filter: Record<string, unknown>): string {
        const conditions: string[] = []
        for (const [key, value] of Object.entries(filter)) {
            if (value === undefined) continue
            if (value !== null && typeof value === 'object' && !(value instanceof Uint8Array)) {
                const obj = value as Record<string, unknown>
                for (const [op, val] of Object.entries(obj)) {
                    switch (op) {
                        case 'eq': conditions.push(`"${key}" = ${this.escapeValue(val)}`); break
                        case 'ne': conditions.push(`"${key}" != ${this.escapeValue(val)}`); break
                        case 'gt': conditions.push(`"${key}" > ${this.escapeValue(val)}`); break
                        case 'gte': conditions.push(`"${key}" >= ${this.escapeValue(val)}`); break
                        case 'lt': conditions.push(`"${key}" < ${this.escapeValue(val)}`); break
                        case 'lte': conditions.push(`"${key}" <= ${this.escapeValue(val)}`); break
                        case 'in':
                            if (Array.isArray(val)) {
                                conditions.push(`"${key}" IN (${val.map(v => this.escapeValue(v)).join(', ')})`)
                            }
                            break
                        case 'like': conditions.push(`"${key}" LIKE ${this.escapeValue(val)}`); break
                    }
                }
            } else {
                conditions.push(`"${key}" = ${this.escapeValue(value)}`)
            }
        }
        return conditions.length > 0 ? conditions.join(' AND ') : '1=1'
    }

    private buildSetClause(data: Record<string, unknown>): string {
        const assignments: string[] = []
        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue
            assignments.push(`"${key}" = ${this.escapeValue(value)}`)
        }
        return assignments.join(', ')
    }

    private buildInsertParts(data: Record<string, unknown>): { columns: string; values: string } {
        const cols: string[] = []
        const vals: string[] = []
        for (const [key, value] of Object.entries(data)) {
            if (value === undefined) continue
            cols.push(`"${key}"`)
            vals.push(this.escapeValue(value))
        }
        return { columns: cols.join(', '), values: vals.join(', ') }
    }

    private normalizeRows(result: unknown): Record<string, unknown>[] {
        if (result === null || result === undefined) return []
        if (Array.isArray(result)) return result as Record<string, unknown>[]
        return [result as Record<string, unknown>]
    }

    async findById(id: string | number): Promise<EntitySelect<State> | null> {
        const pk = this.primaryKey
        if (!pk) throw new Error('No primary key column defined on this entity')
        const sql = `SELECT * FROM "${this.state.name}" WHERE "${pk.name}" = ${this.escapeValue(id)} LIMIT 1`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) return null
        return this.selectSchema.parse(rows[0])
    }

    async findOne(filter?: Where<State>): Promise<EntitySelect<State> | null> {
        const where = filter ? this.buildWhereClause(filter as Record<string, unknown>) : '1=1'
        const sql = `SELECT * FROM "${this.state.name}" WHERE ${where} LIMIT 1`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) return null
        return this.selectSchema.parse(rows[0])
    }

    async findMany(filter?: Where<State>): Promise<EntitySelect<State>[]> {
        const where = filter ? this.buildWhereClause(filter as Record<string, unknown>) : '1=1'
        const sql = `SELECT * FROM "${this.state.name}" WHERE ${where}`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        return rows.map(row => this.selectSchema.parse(row))
    }

    async count(filter?: Where<State>): Promise<number> {
        const where = filter ? this.buildWhereClause(filter as Record<string, unknown>) : '1=1'
        const sql = `SELECT COUNT(*) as count FROM "${this.state.name}" WHERE ${where}`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) return 0
        return Number(rows[0].count)
    }

    async exist(filter?: Where<State>): Promise<boolean> {
        const where = filter ? this.buildWhereClause(filter as Record<string, unknown>) : '1=1'
        const sql = `SELECT 1 as "exists" FROM "${this.state.name}" WHERE ${where} LIMIT 1`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        return rows.length > 0
    }

    async insert(data: EntityInsert<State>): Promise<EntitySelect<State>> {
        const validated = this.insertSchema.parse(data)
        const { columns, values } = this.buildInsertParts(validated as Record<string, unknown>)
        const sql = `INSERT INTO "${this.state.name}" (${columns}) VALUES (${values}) RETURNING *`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) throw new Error('Insert failed: no rows returned')
        return this.selectSchema.parse(rows[0])
    }

    async update(filter: Where<State>, data: EntityUpdate<State>): Promise<EntitySelect<State>[]> {
        const validatedData = this.updateSchema.parse(data)
        const where = this.buildWhereClause(filter as Record<string, unknown>)
        const setClause = this.buildSetClause(validatedData as Record<string, unknown>)
        if (setClause.length === 0) return []
        const sql = `UPDATE "${this.state.name}" SET ${setClause} WHERE ${where} RETURNING *`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        return rows.map(row => this.selectSchema.parse(row))
    }

    async upsert(data: EntityInsert<State>, conflictColumns?: (keyof State)[]): Promise<EntitySelect<State>> {
        const validated = this.insertSchema.parse(data)
        const { columns, values } = this.buildInsertParts(validated as Record<string, unknown>)
        const updateParts = Object.keys(validated as Record<string, unknown>)
            .filter(key => !conflictColumns?.includes(key as any))
            .map(key => `"${key}" = EXCLUDED."${key}"`)
        const conflictTarget = conflictColumns && conflictColumns.length > 0
            ? `(${conflictColumns.map(c => `"${String(c)}"`).join(', ')})`
            : ''
        const upsertClause = updateParts.length > 0
            ? ` ON CONFLICT${conflictTarget ? ' ' + conflictTarget : ''} DO UPDATE SET ${updateParts.join(', ')}`
            : ` ON CONFLICT${conflictTarget ? ' ' + conflictTarget : ''} DO NOTHING`
        const sql = `INSERT INTO "${this.state.name}" (${columns}) VALUES (${values})${upsertClause} RETURNING *`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) throw new Error('Upsert failed: no rows returned')
        return this.selectSchema.parse(rows[0])
    }

    async delete(filter: Where<State>): Promise<EntitySelect<State>[]> {
        const where = this.buildWhereClause(filter as Record<string, unknown>)
        const sql = `DELETE FROM "${this.state.name}" WHERE ${where} RETURNING *`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        return rows.map(row => this.selectSchema.parse(row))
    }

    async deleteById(id: string | number): Promise<EntitySelect<State> | null> {
        const pk = this.primaryKey
        if (!pk) throw new Error('No primary key column defined on this entity')
        const sql = `DELETE FROM "${this.state.name}" WHERE "${pk.name}" = ${this.escapeValue(id)} RETURNING *`
        const result = await this.adapter.query(sql)
        const rows = this.normalizeRows(result)
        if (rows.length === 0) return null
        return this.selectSchema.parse(rows[0])
    }

    async paginate(filter: Where<State> | undefined, options: PaginateOptions): Promise<PaginateResult<State>> {
        const where = filter ? this.buildWhereClause(filter as Record<string, unknown>) : '1=1'
        const { page = 1, pageSize = 20 } = options
        const offset = (page - 1) * pageSize
        const countSql = `SELECT COUNT(*) as count FROM "${this.state.name}" WHERE ${where}`
        const countResult = await this.adapter.query(countSql)
        const countRows = this.normalizeRows(countResult)
        const total = Number(countRows[0]?.count || 0)
        const dataSql = `SELECT * FROM "${this.state.name}" WHERE ${where} LIMIT ${pageSize} OFFSET ${offset}`
        const dataResult = await this.adapter.query(dataSql)
        const dataRows = this.normalizeRows(dataResult)
        const data = dataRows.map(row => this.selectSchema.parse(row))
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        }
    }
}
