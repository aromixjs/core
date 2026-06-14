import { execSync } from 'child_process'
import { appendFileSync, existsSync, readFileSync } from 'fs'

if (!existsSync('.bumped')) {
    console.log('No .bumped manifest found, skipping')
    process.exit(0)
}

const content = readFileSync('.bumped', 'utf8')
const lines = content.trim().split('\n').filter(Boolean)

execSync('pnpm -r build', { stdio: 'inherit' })

let publishedCount = 0

for (const line of lines) {
    const parts = line.split(' ')
    const name = parts[0]
    const version = parts[1]

    if (!name || !version) {
        console.log(`Skipping invalid bump line: ${line}`)
        continue
    }

    console.log(`Publishing ${name}@${version}...`)

    try {
        execSync(`pnpm --filter "${name}" publish --access public --no-git-checks`, {
            stdio: 'inherit',
        })
        publishedCount++
    } catch (e) {
        const stderr = e.stderr?.toString() || ''

        if (stderr.includes('You cannot publish over the previously published version')) {
            console.log(`${name}@${version} already published, skipping`)
        } else {
            throw e
        }
    }
}

appendFileSync(process.env.GITHUB_OUTPUT, `published=${publishedCount > 0}\n`)
