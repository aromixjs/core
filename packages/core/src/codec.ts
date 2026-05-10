import { encode, decode } from '@msgpack/msgpack';

export const Codec = {
  encode(data: unknown): Uint8Array {
    return encode(data);
  },
  decode(buf: ArrayBuffer | Uint8Array): unknown {
    return decode(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf);
  },
  response(data: unknown, status = 200): Response {
    return new Response(Codec.encode(data), {
      status,
      headers: { 'Content-Type': 'application/x-msgpack' },
    });
  },
  async fromRequest(req: Request): Promise<unknown> {
    const buf = await req.arrayBuffer();
    return buf.byteLength > 0 ? Codec.decode(buf) : undefined;
  },
};