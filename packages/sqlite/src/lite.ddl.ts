import { $meta, Collation, ColType, ColTypeMap, DateFormat, Input, Meta, ReferenceAction, UniqueConflict } from './lite.type'

export class lite<Type extends ColType = ColType> {
      [$meta]: Meta

      private constructor(input: Input) {
            this[$meta] = {
                  type: input.type,
                  dateFormat: input.dateFormat,
                  primaryKey: false,
                  autoIncrement: false,
                  notNull: false,
                  unique: false,
            }
      }

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

      primaryKey() {
            this[$meta].primaryKey = true
            return this
      }

      autoIncrement() {
            this[$meta].autoIncrement = true
            return this
      }

      notNull() {
            this[$meta].notNull = true
            return this
      }

      unique(conflict: UniqueConflict = 'conflict:error') {
            this[$meta].unique = true
            this[$meta].uniqueConflict = conflict
            return this
      }

      default(value: ColTypeMap[Type]) {
            this[$meta].default = value
            return this
      }

      defaultFn(callback: () => ColTypeMap[Type]) {
            this[$meta].defaultFn = callback
            return this
      }

      onUpdate(callback: () => ColTypeMap[Type]) {
            this[$meta].onUpdate = callback
            return this
      }

      collate(collation: Collation) {
            this[$meta].collate = collation
            return this
      }

      references(col: any, actions?: ReferenceAction[]) {
            this[$meta].references = {
                  col,
                  actions: actions || [],
            }

            return this
      }

      min(value: number) {
            this[$meta].min = value
            return this
      }

      max(value: number) {
            this[$meta].max = value
            return this
      }

      minLength(value: number) {
            this[$meta].minLength = value
            return this
      }

      maxLength(value: number) {
            this[$meta].maxLength = value
            return this
      }

      in(values: string[]) {
            this[$meta].in = values
            return this
      }

      lt(col: string) {
            this[$meta].lt = col
            return this
      }

      gt(col: string) {
            this[$meta].gt = col
            return this
      }

      lte(col: string) {
            this[$meta].lte = col
            return this
      }

      gte(col: string) {
            this[$meta].gte = col
            return this
      }

      uniqueWith(cols: string[], conflict: UniqueConflict = 'conflict:error') {
            this[$meta].uniqueWith = cols
            this[$meta].uniqueWithConflict = conflict
            return this
      }

      indexWith(cols: string[]) {
            this[$meta].indexWith = cols
            return this
      }

      uniqueIndexWith(cols: string[]) {
            this[$meta].uniqueIndexWith = cols
            return this
      }

      primaryKeyWith(cols: string[]) {
            this[$meta].primaryKeyWith = cols
            return this
      }
}
