import { compose, make } from '@aromix/core'
import { serve } from '@aromix/bun'
import { UserEntity, PostEntity, CommentEntity } from './entities'

const descriptor = make(compose({ entities: [UserEntity, PostEntity, CommentEntity] }))

console.log('Blog API Routes:')
for (const [id, entry] of Object.entries(descriptor.state.routes)) {
    console.log(`  ${id}  →  ${entry.entityName}.${entry.method}`)
}

const server = await serve({
    descriptor,
    port: 3020,
    async fetch(req) {
        const url = new URL(req.url)
        let path = url.pathname === '/' ? '/index.html' : url.pathname
        const file = Bun.file(`./public${path}`)
        if (await file.exists()) return new Response(file)
        return new Response('Not found', { status: 404 })
    },
})

console.log(`Blog server running on http://localhost:3020`)

process.on('SIGINT', () => { server.stop(); process.exit(0) })
process.on('SIGTERM', () => { server.stop(); process.exit(0) })
