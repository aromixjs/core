/**
 *  DDL IMPLEMENTATION FOR SQL LITE
 */

import { liteKit } from "./lite.kit"

export class lite<Type extends liteKit.ColType = liteKit.ColType> {

   [liteKit.$meta]: liteKit.Meta

   private constructor(input: liteKit.Input) {
      this[liteKit.$meta] = {
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

   static date(format: liteKit.DateFormat) {
      return new lite<'date'>({ type: 'date', dateFormat: format })
   }


   // col modifiers
   primaryKey() {
      this[liteKit.$meta].primaryKey = true
      return this
   }

   autoIncrement() {
      this[liteKit.$meta].autoIncrement = true
      return this
   }

   notNull() {
      this[liteKit.$meta].notNull = true
      return this
   }

   unique(conflict: liteKit.UniqueConflict = 'conflict:error') {
      this[liteKit.$meta].unique = true
      this[liteKit.$meta].uniqueConflict = conflict
      return this
   }

   default(value: liteKit.ColTypeMap[Type]) {
      this[liteKit.$meta].default = value
      return this
   }

   defaultFn(callback: () => liteKit.ColTypeMap[Type]) {
      this[liteKit.$meta].defaultFn = callback
      return this
   }

   onUpdate(callback: () => liteKit.ColTypeMap[Type]) {
      this[liteKit.$meta].onUpdate = callback
      return this
   }

   collate(collation: liteKit.Collation) {
      this[liteKit.$meta].collate = collation
      return this
   }


   references(col: any, actions?: liteKit.ReferenceAction[]) {
      this[liteKit.$meta].references = {
         col,
         actions: actions || []
      }

      return this
   }


   // single-col value checks
   min(value: number) {
      this[liteKit.$meta].min = value
      return this
   }

   max(value: number) {
      this[liteKit.$meta].max = value
      return this
   }

   minLength(value: number) {
      this[liteKit.$meta].minLength = value
      return this
   }


   maxLength(value: number) {
      this[liteKit.$meta].maxLength = value
      return this
   }


   in(values: string[]) {
      this[liteKit.$meta].in = values
      return this
   }

   lt(col: string) {
      this[liteKit.$meta].lt = col
      return this
   }

   gt(col: string) {
      this[liteKit.$meta].gt = col

      return this
   }

   lte(col: string) {

      this[liteKit.$meta].lte = col
      return this
   }


   gte(col: string) {

      this[liteKit.$meta].gte = col
      return this
   }


   uniqueWith(cols: string[], conflict: liteKit.UniqueConflict = 'conflict:error') {
      this[liteKit.$meta].uniqueWith = cols
      this[liteKit.$meta].uniqueWithConflict = conflict
      return this
   }

   indexWith(cols: string[]) {
      this[liteKit.$meta].indexWith = cols
      return this

   }


   uniqueIndexWith(cols: string[]) {
      this[liteKit.$meta].uniqueIndexWith = cols
      return this
   }


   primaryKeyWith(cols: string[]) {
      this[liteKit.$meta].primaryKeyWith = cols
      return this
   }





}