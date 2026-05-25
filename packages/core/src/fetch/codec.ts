import { decode, encode } from '@msgpack/msgpack'

export const Codec = {
      encode(data: unknown): Uint8Array {
            return encode(data)
      },

      decode(buf: Uint8Array): unknown {
            return decode(buf)
      },

      async fromRequest(req: Request): Promise<unknown> {
            const contentType = req.headers.get('content-type')
            if (contentType !== 'application/x-msgpack') {
                  throw new Error(`Invalid content-type "${contentType}" — only application/x-msgpack is accepted`)
            }

            const buf = await req.arrayBuffer()
            if (buf.byteLength === 0) {
                  return undefined
            }

            return decode(new Uint8Array(buf))
      },

      response(data: unknown): Response {
            return new Response(encode(data), {
                  status: 200,
                  headers: { 'Content-Type': 'application/x-msgpack' },
            })
      },
}
