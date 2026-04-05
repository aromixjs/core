import type { AromixDescriptor } from "@aromix/core";

export interface ServeOptions {
  port?: number;
  hostname?: string;
}

export function serve(descriptor: AromixDescriptor, options?: ServeOptions) {
  const hostname = options?.hostname ?? process.env.HOST ?? "0.0.0.0";

  return Bun.serve({
    port: options?.port ?? (process.env.PORT ? parseInt(process.env.PORT) : 3000),
    hostname,

    async fetch(req: Request): Promise<Response> {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }

      try {
        return await dispatch(req, descriptor);
      } catch (err) {
        console.error("[aromix] Unhandled server error:", err);
        return new Response("Internal Server Error", {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────
// CORS headers helper
// ─────────────────────────────────────────────────────────────
function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

// ─────────────────────────────────────────────────────────────
// Simple exact-path routing (no dynamic params)
// ─────────────────────────────────────────────────────────────
async function dispatch(req: Request, descriptor: AromixDescriptor): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const pathname = url.pathname;

  for (const route of descriptor.routes) {
    if (route.method !== method) continue;
    if (route.path !== pathname) continue;

    try {
      return await route.handler(req);
    } catch (err) {
      console.error(`[aromix] Error in route ${method} ${route.path}:`, err);
      return new Response("Internal Server Error", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}
