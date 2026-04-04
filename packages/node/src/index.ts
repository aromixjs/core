import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { TLSSocket } from "node:tls";

import type { AromixDescriptor } from "@aromix/core";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    // Basic CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    try {
      const webReq = toWebRequest(req);
      const webRes = await dispatch(webReq, descriptor);
      await writeWebResponse(res, webRes);
    } catch (err) {
      console.error("[aromix] Unhandled server error:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  });

  // App lifecycle hooks
  server.on("listening", async () => {
    console.log(`[aromix] Server listening on ${server.address()}`);
    for (const hook of descriptor.appStartHooks) {
      await hook.fn();   // note: .fn() not .run()
    }
  });

  server.on("close", async () => {
    for (const hook of descriptor.appStopHooks) {
      await hook.fn();
    }
  });

  return server;
}

// ─────────────────────────────────────────────────────────────
// Convert Node.js IncomingMessage → Web Standard Request
// ─────────────────────────────────────────────────────────────
function toWebRequest(req: IncomingMessage): Request {
  const protocol = req.socket instanceof TLSSocket ? "https:" : "http:";
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `${protocol}//${host}`);

  return new Request(url.toString(), {
    method: req.method || "GET",
    headers: req.headers as Record<string, string>,
    body:
      req.method !== "GET" && req.method !== "HEAD"
        ? (Readable.toWeb(req) as ReadableStream<Uint8Array>)
        : undefined,
    // @ts-ignore - required by Node.js undici
    duplex: "half",
  });
}

// ─────────────────────────────────────────────────────────────
// Simple exact-path routing (no dynamic params as requested)
// ─────────────────────────────────────────────────────────────
async function dispatch(req: Request, descriptor: AromixDescriptor): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const pathname = url.pathname;

  // Find matching route (exact match only - simple & reliable)
  for (const route of descriptor.routes) {
    if (route.method !== method) continue;
    if (route.path !== pathname) continue;

    try {
      // TODO: Later we can add global + route-specific hooks here
      return await route.handler(req);
    } catch (err) {
      console.error(`[aromix] Error in route ${method} ${route.path}:`, err);

      // You can later integrate errorHooks here
      return new Response("Internal Server Error", { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }
  }

  // No route matched
  return new Response("Not Found", { 
    status: 404,
    headers: { "Content-Type": "text/plain" }
  });
}

// ─────────────────────────────────────────────────────────────
// Convert Web Response → Node.js ServerResponse
// ─────────────────────────────────────────────────────────────
async function writeWebResponse(res: ServerResponse, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;

  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (webRes.body) {
    const body = await webRes.arrayBuffer();
    res.end(Buffer.from(body));
  } else {
    res.end();
  }
}