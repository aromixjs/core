import { AromixDescriptor } from "@aromix/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { TLSSocket } from "node:tls";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    const webReq = toWebRequest(req);
    const webRes = await dispatch(webReq, descriptor);
    await writeWebResponse(res, webRes);
  });

  server.on("listening", async () => {
    for (const hook of descriptor.appStartHooks) await hook.run();
  });

  server.on("close", async () => {
    for (const hook of descriptor.appStopHooks) await hook.run();
  });

  return server;
}

// converts node IncomingMessage → web Request
function toWebRequest(req: IncomingMessage): Request {
  const protocol = req.socket instanceof TLSSocket ? "https" : "http";
  const url = new URL(req.url!, `${protocol}://${req.headers.host}`);

  return new Request(url.href, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method !== "GET" && req.method !== "HEAD" ? (Readable.toWeb(req) as ReadableStream) : undefined,
    // @ts-ignore — node fetch needs this
    duplex: "half",
  });
}

// matches request against registered plugin routes
async function dispatch(req: Request, descriptor: AromixDescriptor): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  for (const route of descriptor.routes) {
    if (route.method !== method) continue;
    if (!matchPath(route.path, url.pathname)) continue;

    try {
      return await route.handler(req);
    } catch (err) {
      console.error(`[aromix] route error ${method} ${route.path}`, err);
      return new Response("Internal server error", { status: 500 });
    }
  }

  return new Response("Not found", { status: 404 });
}

// writes web Response → node ServerResponse
async function writeWebResponse(res: ServerResponse, webRes: Response): Promise<void> {
  res.statusCode = webRes.status;

  webRes.headers.forEach((value, key) => res.setHeader(key, value));

  const body = await webRes.arrayBuffer();
  res.end(Buffer.from(body));
}

// simple path matcher — supports :param segments
function matchPath(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split("/");
  const pathnameParts = pathname.split("/");

  if (patternParts.length !== pathnameParts.length) return false;

  return patternParts.every((part, i) => part.startsWith(":") || part === pathnameParts[i]);
}
