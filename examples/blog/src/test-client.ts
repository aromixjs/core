import { encode, decode } from '@msgpack/msgpack'

const WS_URL = 'ws://localhost:3020'
const TIMEOUT = 5000

const ws = new WebSocket(WS_URL)
ws.binaryType = 'arraybuffer'

await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = () => reject(new Error('Connection failed'))
})
console.log('=== Connected to Blog Server ===\n')

function sendMsg(route: string, data?: unknown) {
    ws.send(encode({ route, data }))
}

function waitResponse(): Promise<any> {
    return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
            ws.removeEventListener('message', handler)
            const res = decode(new Uint8Array(event.data as ArrayBuffer))
            if ((res as any).error) reject(new Error((res as any).error))
            else resolve(res)
        }
        ws.addEventListener('message', handler)
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
    })
}

async function call(method: string, data?: unknown): Promise<unknown> {
    sendMsg(method, data)
    const res = await waitResponse()
    return (res as any).data
}

async function test(desc: string, fn: () => Promise<void>) {
    try {
        await fn()
        console.log(`  ✓ ${desc}`)
    } catch (err) {
        console.log(`  ✗ ${desc}: ${err}`)
    }
}

// ── Seed: Create users ──
let aliceId: number, bobId: number, postId: number

await test('Create Alice', async () => {
    const user = await call('users.insert', { name: 'Alice', email: 'alice@blog.com' }) as any
    aliceId = user.id
    console.log(`    id=${user.id}, email=${user.email}`)
})

await test('Create Bob', async () => {
    const user = await call('users.insert', { name: 'Bob', email: 'bob@blog.com' }) as any
    bobId = user.id
})

// ── Posts ──
await test('Create a post by Alice', async () => {
    const post = await call('posts.insert', { title: 'Hello World', body: 'My first post!', authorId: aliceId, status: 'published' }) as any
    postId = post.id
    console.log(`    id=${post.id}, title="${post.title}"`)
})

await test('Create a draft post by Alice', async () => {
    await call('posts.insert', { title: 'Draft Ideas', body: 'Still working on this...', authorId: aliceId })
})

await test('Find published posts', async () => {
    const posts = await call('posts.findMany', { status: 'published' }) as any[]
    console.log(`    ${posts.length} post(s)`)
})

// ── Comments ──
await test('Bob comments on the post', async () => {
    const comment = await call('comments.insert', { postId, authorId: bobId, content: 'Great post!' }) as any
    console.log(`    comment id=${comment.id}`)
})

await test('Count comments on post', async () => {
    const count = await call('comments.count', { postId }) as number
    console.log(`    ${count} comment(s)`)
})

// ── Update ──
await test('Publish the draft post', async () => {
    const updated = await call('posts.update', [{ authorId: aliceId, status: 'draft' }, { status: 'published' }]) as any[]
    console.log(`    updated ${updated.length} post(s)`)
})

// ── Query ──
await test('Paginate posts', async () => {
    const result = await call('posts.paginate', [undefined, { page: 1, pageSize: 10 }]) as any
    console.log(`    ${result.total} total, page ${result.page}/${result.totalPages}`)
})

await test('Find user by email', async () => {
    const user = await call('users.findOne', { email: 'alice@blog.com' }) as any
    console.log(`    found: ${user.name}`)
})

await test('Count users', async () => {
    const count = await call('users.count') as number
    console.log(`    ${count} user(s)`)
})

// ── Delete ──
await test('Soft-check: comment exists', async () => {
    const exists = await call('comments.exist', { id: 1 }) as boolean
    console.log(`    comment exists: ${exists}`)
})

console.log('\n=== All blog tests completed ===')
ws.close()
