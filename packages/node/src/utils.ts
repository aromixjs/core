import { IncomingPacket } from "@aromix/core";
import { decode, encode } from "@msgpack/msgpack";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { TLSSocket } from "tls";

/// NOTE:: NO NEED  TO GIVE STRICT TYPES HERE THE VALIDATION SCHEMA DECIDES WHAT TYPE IT WILL BE

export async function parseIncoming(req: IncomingMessage): Promise<IncomingPacket> {
  const protocol = req.socket instanceof TLSSocket ? "https" : "http";
  const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

  const webReq = new Request(fullUrl.href, {
    method: req.method,
    headers: req.headers as Record<string, string | string[]>,
    body: req.method !== "GET" && req.method !== "HEAD" ? Readable.toWeb(req) : undefined,
    duplex: "half",
  });

  const contentType = webReq.headers.get("content-type");

  if (contentType !== "application/msgpack") {
    throw new Error("Expected content-type: application/msgpack");
  }

  const action = webReq.headers.get("x-action");

  if (!action) {
    throw new Error("Missing X-Action header");
  }

  const buffer = await webReq.arrayBuffer();
  const payload = buffer.byteLength > 0 ? decode(new Uint8Array(buffer)) : {};

  return {
    action,
    payload,
    headers: Object.fromEntries(webReq.headers.entries()),
    ip: req.socket.remoteAddress ?? "",
    url: fullUrl,
  };
}

export function writeResponse(serverRes: ServerResponse, body: unknown): void {
  const encoded = encode(body);
  serverRes.statusCode = 200;
  serverRes.setHeader("content-type", "application/msgpack");
  serverRes.end(Buffer.from(encoded));
}
