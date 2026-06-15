import { Collation, ColumnState, ColumnType, ColumnTypeMap, ReferenceAction, UniqueConflict } from "./column.types"

export type Chain<Type extends ColumnType, Used extends string = never> = Omit<
   {
      readonly state: ColumnState
      primaryKey(): Chain<Type, Used | 'primaryKey' | 'notNull'>

      autoIncrement(): Chain<Type, Used | 'autoIncrement'>

      notNull(): Chain<Type, Used | 'notNull'>

      unique(conflict: UniqueConflict): Chain<Type, Used | 'unique'>

      index(): Chain<Type, Used | 'index'>

      collate(value: Collation): Chain<Type, Used | 'collate'>


      gt(value: number): Chain<Type, Used>
      gte(value: number): Chain<Type, Used>
      lt(value: number): Chain<Type, Used>
      lte(value: number): Chain<Type, Used>
      minLength(value: number): Chain<Type, Used>
      maxLength(value: number): Chain<Type, Used>

      in(values: ColumnTypeMap[Type][]): Chain<Type, Used | 'in'>

      references(col: unknown, actions?: ReferenceAction[]): Chain<Type, Used | 'references'>

      default(value: ColumnTypeMap[Type]): Chain<Type, Used | 'default' | 'defaultFn'>
      defaultFn(fn: () => ColumnTypeMap[Type]): Chain<Type, Used | 'defaultFn' | 'default'>
      onUpdate(fn: () => ColumnTypeMap[Type]): Chain<Type, Used | 'onUpdate'>
   },
   Used
>
