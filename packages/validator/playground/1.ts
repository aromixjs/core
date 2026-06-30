import { ax, ParseBase } from './../src'
const schema = ax.string()

const [data, err] = ParseBase(schema, [10])

console.log(data, err)
