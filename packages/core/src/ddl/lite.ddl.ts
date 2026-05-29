/**
 *  DDL IMPLEMENTATION FOR SQL LITE
 */

import { Kit } from '../global/kit'
import { Collation, ColType, ColTypeMap, DateFormat, Input, Meta, ReferenceAction, UniqueConflict } from './lite.type'

export class lite<Type extends ColType = ColType> {
      [Kit.$meta]: Meta

      private constructor(input: Input) {
            this[Kit.$meta] = {
                  type: input.type,
                  dateFormat: input.dateFormat,
                  primaryKey: false,
                  autoIncrement: false,
                  notNull: false,
                  unique: false,
            }
      }

      // all data type entry
      static int() {
            return new lite<'int'>({ type: 'int' })
      }

      static real() {
            return new lite<'real'>({ type: 'real' })
      }

      static text() {
            return new lite<'text'>({ type: 'text' })
      }

      static blob() {
            return new lite<'blob'>({ type: 'blob' })
      }

      static bool() {
            return new lite<'boolean'>({ type: 'boolean' })
      }

      static bigint() {
            return new lite<'bigint'>({ type: 'bigint' })
      }

      static date(format: DateFormat) {
            return new lite<'date'>({ type: 'date', dateFormat: format })
      }

      // col modifiers
      primaryKey() {
            this[Kit.$meta].primaryKey = true
            return this
      }

      autoIncrement() {
            this[Kit.$meta].autoIncrement = true
            return this
      }

      notNull() {
            this[Kit.$meta].notNull = true
            return this
      }

      unique(conflict: UniqueConflict = 'conflict:error') {
            this[Kit.$meta].unique = true
            this[Kit.$meta].uniqueConflict = conflict
            return this
      }

      default(value: ColTypeMap[Type]) {
            this[Kit.$meta].default = value
            return this
      }

      defaultFn(callback: () => ColTypeMap[Type]) {
            this[Kit.$meta].defaultFn = callback
            return this
      }

      onUpdate(callback: () => ColTypeMap[Type]) {
            this[Kit.$meta].onUpdate = callback
            return this
      }

      collate(collation: Collation) {
            this[Kit.$meta].collate = collation
            return this
      }

      references(col: any, actions?: ReferenceAction[]) {
            this[Kit.$meta].references = {
                  col,
                  actions: actions || [],
            }

            return this
      }

      // single-col value checks
      min(value: number) {
            this[Kit.$meta].min = value
            return this
      }

      max(value: number) {
            this[Kit.$meta].max = value
            return this
      }

      minLength(value: number) {
            this[Kit.$meta].minLength = value
            return this
      }

      maxLength(value: number) {
            this[Kit.$meta].maxLength = value
            return this
      }

      in(values: string[]) {
            this[Kit.$meta].in = values
            return this
      }

      lt(col: string) {
            this[Kit.$meta].lt = col
            return this
      }

      gt(col: string) {
            this[Kit.$meta].gt = col

            return this
      }

      lte(col: string) {
            this[Kit.$meta].lte = col
            return this
      }

      gte(col: string) {
            this[Kit.$meta].gte = col
            return this
      }

      uniqueWith(cols: string[], conflict: UniqueConflict = 'conflict:error') {
            this[Kit.$meta].uniqueWith = cols
            this[Kit.$meta].uniqueWithConflict = conflict
            return this
      }

      indexWith(cols: string[]) {
            this[Kit.$meta].indexWith = cols
            return this
      }

      uniqueIndexWith(cols: string[]) {
            this[Kit.$meta].uniqueIndexWith = cols
            return this
      }

      primaryKeyWith(cols: string[]) {
            this[Kit.$meta].primaryKeyWith = cols
            return this
      }
}
