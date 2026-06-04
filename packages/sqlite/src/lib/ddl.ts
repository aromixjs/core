import { ColType, DateFormat, DdlInput, DdlState, UniqueConflict, Collation, ReferenceAction } from './types'

export class Ddl<Type extends ColType = ColType> {
  readonly state: DdlState

  private constructor(input: DdlInput) {
    this.state = {
      type: input.type,
      dateFormat: input.dateFormat,
      primaryKey: false,
      autoIncrement: false,
      notNull: false,
      unique: false,
    }
  }

  static int() {
    return new Ddl<'int'>({ type: 'int' })
  }

  static real() {
    return new Ddl<'real'>({ type: 'real' })
  }

  static text() {
    return new Ddl<'text'>({ type: 'text' })
  }

  static blob() {
    return new Ddl<'blob'>({ type: 'blob' })
  }

  static bool() {
    return new Ddl<'boolean'>({ type: 'boolean' })
  }

  static bigint() {
    return new Ddl<'bigint'>({ type: 'bigint' })
  }

  static date(format: DateFormat) {
    return new Ddl<'date'>({ type: 'date', dateFormat: format })
  }

  primaryKey() {
    this.state.primaryKey = true
    return this
  }

  autoIncrement() {
    this.state.autoIncrement = true
    return this
  }

  notNull() {
    this.state.notNull = true
    return this
  }

  unique(conflict: UniqueConflict = 'conflict:error') {
    this.state.unique = true
    this.state.uniqueConflict = conflict
    return this
  }

  default(value: unknown) {
    this.state.default = value
    return this
  }

  defaultFn(callback: () => unknown) {
    this.state.defaultFn = callback
    return this
  }

  onUpdate(callback: () => unknown) {
    this.state.onUpdate = callback
    return this
  }

  collate(collation: Collation) {
    this.state.collate = collation
    return this
  }

  references(col: any, actions?: ReferenceAction[]) {
    this.state.references = {
      col,
      actions: actions || [],
    }
    return this
  }

  min(value: number) {
    this.state.min = value
    return this
  }

  max(value: number) {
    this.state.max = value
    return this
  }

  minLength(value: number) {
    this.state.minLength = value
    return this
  }

  maxLength(value: number) {
    this.state.maxLength = value
    return this
  }

  in(values: string[]) {
    this.state.in = values
    return this
  }

  lt(col: string) {
    this.state.lt = col
    return this
  }

  gt(col: string) {
    this.state.gt = col
    return this
  }

  lte(col: string) {
    this.state.lte = col
    return this
  }

  gte(col: string) {
    this.state.gte = col
    return this
  }

  uniqueWith(cols: string[], conflict: UniqueConflict = 'conflict:error') {
    this.state.uniqueWith = cols
    this.state.uniqueWithConflict = conflict
    return this
  }

  indexWith(cols: string[]) {
    this.state.indexWith = cols
    return this
  }

  uniqueIndexWith(cols: string[]) {
    this.state.uniqueIndexWith = cols
    return this
  }

  primaryKeyWith(cols: string[]) {
    this.state.primaryKeyWith = cols
    return this
  }
}
