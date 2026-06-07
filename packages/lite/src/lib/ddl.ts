import { Chain } from './chain.type'
import { ColType, ColTypeMap, DDLState } from './state.type'

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

}
