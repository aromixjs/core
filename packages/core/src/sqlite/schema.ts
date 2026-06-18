type DbType = 'int' | 'text'

interface OutputN<
  Col extends string,
  Type extends DbType
> {
  col: Col
  type: Type
}

interface Builder {
  int<const Col extends string>(
    col: Col
  ): OutputN<Col, 'int'>

  text<const Col extends string>(
    col: Col
  ): OutputN<Col, 'text'>
}

type TypeMap = {
  int: number
  text: string
}

type Infer<
  T extends readonly OutputN<string, DbType>[]
> = {
  [K in T[number] as K['col']]:
    TypeMap[K['type']]
}

function entity<
  const T extends readonly OutputN<string, DbType>[]
>(input: {
  schema: (builder: Builder) => T
}) {
  const output = input.schema({
    int(col) {
      return {
        col,
        type: 'int',
      }
    },

    text(col) {
      return {
        col,
        type: 'text',
      } as any
    },
  })

  return {
    $infer: null as any as Infer<T>,
    columns: output,
  }
}


const users = entity({
  schema: (b) => [
    b.int('user'),
    b.text('id'),
  ]
})

type User = typeof users.$infer.id