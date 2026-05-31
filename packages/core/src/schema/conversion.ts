import { $meta, type LiteModel, type Meta } from '@aromix/sqlite'
import * as v from 'valibot'
import { InsertSchema, SelectSchema, ToShape, UpdateSchema } from './conversion.type'
import { Type } from '../global/type'

export class SchemaBuilder<Model extends LiteModel> {
      private model: Model

      constructor(model: Model) {
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
            if (meta.min !== undefined) schema = v.pipe(schema, v.minValue(meta.min))
            if (meta.max !== undefined) schema = v.pipe(schema, v.maxValue(meta.max))
            if (meta.minLength !== undefined) schema = v.pipe(schema, v.minLength(meta.minLength))
            if (meta.maxLength !== undefined) schema = v.pipe(schema, v.maxLength(meta.maxLength))
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
            return Object.fromEntries(
                  Object.entries(this.model).map(([key, col]) => [
                        key,
                        this.buildCol(col[$meta], context)
                  ])
            )
      }
      select(): v.ObjectSchema<Type.Prettify<ToShape<Model, 'select'>>, undefined> {
            return v.object(this.buildShape('select')) as any
      }

      insert(): v.ObjectSchema<Type.Prettify<ToShape<Model, 'insert'>>, undefined> {
            return v.object(this.buildShape('insert')) as any
      }

      update(): v.ObjectSchema<Type.Prettify<ToShape<Model, 'update'>>, undefined> {
            return v.object(this.buildShape('update')) as any
      }
}
