import { ReplyValue } from "@aromix/core";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";

/// NOTE:: NO NEED  TO GIVE STRICT TYPES HERE THE VALIDATION SCHEMA DECIDES WHAT TYPE IT WILL BE
export async function parseBody(req: Request) {
  const contentType = req.headers.get("content-type");

  switch (contentType) {
    case "application/json": {
      return req.json();
    }

    case "multipart/form-data":
    case "application/x-www-form-urlencoded": {
      const form = await req.formData();
      return Object.fromEntries(form.entries());
    }

    case "text/plain": {
      return req.text();
    }

    case "application/octet-stream": {
      return req.arrayBuffer();
    }

    default: {
      if (contentType?.includes("json")) {
        return req.json();
      }
      if (contentType?.startsWith("text/")) {
        return req.text();
      }
      return {};
    }
  }
}

export function toWebRequest(url: string, req: IncomingMessage): Request {
  let body: ReadableStream | undefined = undefined;

  if (req.method !== "GET" && req.method !== "HEAD") {
    body = Readable.toWeb(req);
  }

  return new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string | string[]>,
    body,
    duplex: "half",
  });
}

export async function writeNodeResponse(res: ServerResponse, value: ReplyValue) {
  if (value.headers) {
    for (const [key, val] of Object.entries(value.headers)) {
      res.setHeader(key, val);
    }
  }

  const body =
    value.data !== undefined ? JSON.stringify(value.data) : null;

  if (body && !res.hasHeader("content-type")) {
    res.setHeader("Content-Type", "application/json");
  }

  res.writeHead(value.status);
  res.end(body ? Buffer.from(body) : null);
}


export function parseCookies(
  cookieHeader: string | null,
): Record<string, string> {
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const eq = pair.indexOf("=");
        if (eq === -1) return [pair, ""] as [string, string];
        const key = pair.slice(0, eq).trim();
        const val = pair.slice(eq + 1).trim();
        return [key, decodeURIComponent(val)] as [string, string];
      })
      .filter(([key]) => key.length > 0),
  );
}
