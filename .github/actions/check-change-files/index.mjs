import { appendFileSync, readdirSync } from 'fs'

const files = readdirSync('change').filter((file) => file.endsWith('.json'))
const has = files.length > 0

appendFileSync(process.env.GITHUB_OUTPUT, `has=${has}\n`)
