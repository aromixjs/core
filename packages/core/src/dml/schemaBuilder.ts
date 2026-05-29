import { LiteModel, Meta } from '../ddl/lite.type'
import * as v from 'valibot'
import { Kit } from '../global/kit'

export class SchemaBuilder {
      private model: LiteModel

      constructor(model: LiteModel) {
            this.model = model
      }

      private baseSchema(meta: Meta): any {
            switch (meta.type) {
                  case 'int':
                  case 'real':
                        return v.number()
                  case 'text':
                        return v.string()
                  case 'boolean':
                        return v.boolean()
                  case 'blob':
                        return v.instance(Uint8Array)
                  case 'bigint':
                        return v.bigint()
                  case 'date':
                        return v.date()
            }
      }

      private applyConstraints(schema: any, meta: Meta): any {
            if (meta.in) return v.picklist(meta.in)
            if (meta.min) schema = v.pipe(schema, v.minValue(meta.min))
            if (meta.max) schema = v.pipe(schema, v.maxValue(meta.max))
            if (meta.minLength) schema = v.pipe(schema, v.minLength(meta.minLength))
            if (meta.maxLength) schema = v.pipe(schema, v.maxLength(meta.maxLength))
            return schema
      }

      private forSelect(schema: any, meta: Meta): any {
            return meta.notNull ? schema : v.nullable(schema)
      }

      private forInsert(schema: any, meta: Meta): any {
            const hasDefault = meta.default !== undefined || meta.defaultFn !== undefined
            const isOptional = meta.primaryKey || hasDefault || !meta.notNull
            return isOptional ? v.optional(schema) : schema
      }

      private forUpdate(schema: any): any {
            return v.optional(schema)
      }

      private buildCol(meta: Meta, context: 'select' | 'insert' | 'update'): any {
            const base = this.baseSchema(meta)
            const constrained = this.applyConstraints(base, meta)

            switch (context) {
                  case 'select':
                        return this.forSelect(constrained, meta)
                  case 'insert':
                        return this.forInsert(constrained, meta)
                  case 'update':
                        return this.forUpdate(constrained)
            }
      }

      private buildShape(context: 'select' | 'insert' | 'update') {
            return Object.fromEntries(Object.entries(this.model).map(([key, col]) => [key, this.buildCol(col[Kit.$meta], context)]))
      }

      select() {
            return v.object(this.buildShape('select'))
      }
      insert() {
            return v.object(this.buildShape('insert'))
      }
      update() {
            return v.object(this.buildShape('update'))
      }
}
