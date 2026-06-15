import { encode, decode } from '@msgpack/msgpack'
import type { ServerWebSocket } from 'bun'

interface ChatMessage {
    type: 'join' | 'message' | 'leave'
    username: string
    text?: string
    timestamp: number
}

interface BroadcastMsg {
    type: 'join' | 'message' | 'leave'
    username: string
    text?: string
    timestamp: number
    users: number
}

const clients = new Map<ServerWebSocket, string>()
const port = parseInt(process.env.PORT || '3030')

console.log(`Chat server starting on http://localhost:${port}`)

function toBuffer(data: Uint8Array): Buffer {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

function broadcast(msg: BroadcastMsg) {
    const data = encode(msg)
    const buf = toBuffer(data)
    for (const [client] of clients) {
        try { client.sendBinary(buf) } catch { }
    }
}

Bun.serve({
    port,
    async fetch(req, server) {
        const url = new URL(req.url)
        let path = url.pathname === '/' ? '/index.html' : url.pathname
        if (server.upgrade(req)) return
        const file = Bun.file(`./public${path}`)
        if (await file.exists()) return new Response(file)
        return new Response('Chat server', { status: 200 })
    },
    websocket: {
        open(ws) {
            clients.set(ws, 'Anonymous')
            broadcast({ type: 'join', username: 'Anonymous', timestamp: Date.now(), users: clients.size })
        },
        message(ws: ServerWebSocket, raw: string | Buffer) {
            try {
                const buf = typeof raw === 'string' ? Buffer.from(raw) : raw
                const msg = decode(buf) as ChatMessage
                if (msg.type === 'join') {
                    clients.set(ws, msg.username || 'Anonymous')
                }
                broadcast({
                    type: msg.type,
                    username: clients.get(ws) || 'Anonymous',
                    text: msg.text,
                    timestamp: Date.now(),
                    users: clients.size,
                })
            } catch { }
        },
        close(ws) {
            const username = clients.get(ws) || 'Anonymous'
            clients.delete(ws)
            broadcast({ type: 'leave', username, timestamp: Date.now(), users: clients.size })
        },
    },
})

console.log(`Chat server running with 0 clients`)
