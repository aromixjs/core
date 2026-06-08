import { Operator } from '@aromix/validator'
import { Collation, ColType, ColTypeMap, DDLState, ReferenceAction, UniqueConflict } from './state.type'

// Chain :: a fluent interface with phantom Used to permanently remove methods within that context
export type Chain<Type extends ColType, Used extends string = never, Output = ColTypeMap[Type]> = Omit<
      {
            readonly state: DDLState
            primaryKey(): Chain<Type, Used | 'primaryKey'>
            autoIncrement(): Chain<Type, Used | 'autoIncrement'>
            notNull(): Chain<Type, Used | 'notNull'>
            unique(conflict?: UniqueConflict): Chain<Type, Used | 'unique'>
            index(): Chain<Type, Used | 'index'>
            collate(value: Collation): Chain<Type, Used | 'collate'>

            // value checks
            gt(value: number): Chain<Type, Used>
            gte(value: number): Chain<Type, Used>
            lt(value: number): Chain<Type, Used>
            lte(value: number): Chain<Type, Used>
            minLength(value: number): Chain<Type, Used>
            maxLength(value: number): Chain<Type, Used>
            in(values: string[]): Chain<Type, Used | 'in'>
            references(col: unknown, actions?: ReferenceAction[]): Chain<Type, Used | 'references'>

            default(value: ColTypeMap[Type] | (() => ColTypeMap[Type])): Chain<Type, Used | 'default'>
            onUpdate(fn: () => ColTypeMap[Type]): Chain<Type, Used | 'onUpdate'>
            pipe<Next>(operator: Operator<Output, Next>): Chain<Type, Used, Next>
      },
      Used
>

// AnyChain :: accepts a Chain at any Used depth.
export interface AnyChain {
      readonly state: DDLState
}

export type TableModel = Record<string, AnyChain>
