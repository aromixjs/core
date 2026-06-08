import { Operator } from '@aromix/validator'
import { Chain } from './chain.type'
import { Collation, ColType, ColTypeMap, DDLState, ReferenceAction, UniqueConflict } from './state.type'

export class DDL<Type extends ColType> {
      declare readonly $infer: ColTypeMap[Type]
      private constructor(readonly state: DDLState) {}

      // Static Entry point
      static create<Type extends ColType>(colType: Type): Chain<Type> {
            const state: DDLState = {
                  colType,
                  primaryKey: false,
                  autoIncrement: false,
                  notNull: false,
                  unique: false,
                  uniqueConflict: 'conflict:error',
                  index: false,
                  checks: [],
                  in: [],
                  pipes: [],
            }

            return new DDL<Type>(state)
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

      index() {
            this.state.index = true
            return this
      }

      collate(value: Collation) {
            this.state.collate = value
            return this
      }

      // Value Checks
      gt(value: number) {
            this.state.checks.push({
                  op: 'gt',
                  val: value,
            })
            return this
      }

      gte(value: number) {
            this.state.checks.push({
                  op: 'gte',
                  val: value,
            })
            return this
      }

      lt(value: number) {
            this.state.checks.push({
                  op: 'lt',
                  val: value,
            })

            return this
      }

      lte(value: number) {
            this.state.checks.push({
                  op: 'lte',
                  val: value,
            })

            return this
      }

      minLength(value: number) {
            this.state.checks.push({
                  op: 'minLength',
                  val: value,
            })

            return this
      }

      maxLength(value: number) {
            this.state.checks.push({
                  op: 'maxLength',
                  val: value,
            })
            return this
      }

      in(values: string[]) {
            this.state.in = values
            return this
      }

      references(col: unknown, actions: ReferenceAction[] = []) {
            this.state.references = {
                  col,
                  actions,
            }
            return this
      }

      default(value: ColTypeMap[Type] | (() => ColTypeMap[Type])) {
            this.state.default = value
            return this
      }

      onUpdate(fn: () => ColTypeMap[Type]) {
            this.state.onUpdate = fn
            return this
      }

      pipe<Next>(operator: Operator<ColTypeMap[Type], Next>) {
            this.state.pipes.push(operator)
            return this
      }
}
