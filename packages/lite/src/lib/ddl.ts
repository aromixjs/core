import { Chain } from './chain.type'
import { Collation, ColType, ColTypeMap, DDLState, UniqueConflict } from './state.type'

export class DDL<Type extends ColType> {
  declare readonly $infer: ColTypeMap[Type]
  private constructor(readonly state: DDLState) { }


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
      checks: []
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
    this.state.unique = true;
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
      val: value
    })
    return this
  }



}
