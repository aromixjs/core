import { encode, decode } from '@msgpack/msgpack'
import type { NetDescriptor, ProviderOutput } from '@aromix/core'
import type { ServerWebSocket } from 'bun'

export interface BunServeOptions {
    descriptor: NetDescriptor
    provider?: ProviderOutput
    port?: number
    hostname?: string
    fetch?(req: Request, server: any): Response | Promise<Response>
}

export interface WsMessage {
    route: string
    data?: unknown
}

export interface WsResponse {
    route: string
    data?: unknown
    error?: string
}

function toBuffer(data: Uint8Array): Buffer {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

export async function serve(options: BunServeOptions): Promise<any> {
    const { descriptor, provider, port = 3000, hostname = '0.0.0.0' } = options
    const { routes, namedRoutes, entities } = descriptor.state

    if (provider) {
        provider.boot()
    }

    const server = Bun.serve({
        port,
        hostname,
        fetch(req, server) {
            if (server.upgrade(req)) {
                return
            }
            if (options.fetch) {
                return options.fetch(req, server)
            }
            return new Response('Aromix WS server', { status: 200 })
        },
        websocket: {
            async message(ws: ServerWebSocket, raw: string | Buffer) {
                try {
                    const buf = typeof raw === 'string' ? Buffer.from(raw) : raw
                    const msg = decode(buf) as WsMessage
                    // Support both UUID and named route lookup
                    const routeId = routes[msg.route] ? msg.route : namedRoutes[msg.route]
                    if (!routeId) {
                        const response: WsResponse = { route: msg.route, error: `Unknown route: ${msg.route}` }
                        ws.sendBinary(toBuffer(encode(response)))
                        return
                    }

                    const entry = routes[routeId]

                    const entity = entities[entry.entityName]
                    if (!entity) {
                        const response: WsResponse = { route: msg.route, error: `Unknown entity: ${entry.entityName}` }
                        ws.sendBinary(toBuffer(encode(response)))
                        return
                    }

                    const method = (entity as unknown as Record<string, unknown>)[entry.method]
                    if (typeof method !== 'function') {
                        const response: WsResponse = { route: msg.route, error: `Method not found: ${entry.entityName}.${entry.method}` }
                        ws.sendBinary(toBuffer(encode(response)))
                        return
                    }

                    const args = msg.data !== undefined ? (Array.isArray(msg.data) ? msg.data : [msg.data]) : []
                    const result = await (method as (...args: unknown[]) => unknown).apply(entity, args)

                    const response: WsResponse = { route: msg.route, data: result }
                    ws.sendBinary(toBuffer(encode(response)))
                } catch (err) {
                    const response: WsResponse = { route: 'unknown', error: String(err) }
                    ws.sendBinary(toBuffer(encode(response)))
                }
            },
        },
    })

    return server
}
