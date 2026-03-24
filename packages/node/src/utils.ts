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

export async function writeNodeResponse(res: ServerResponse, webRes: Response) {
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.writeHead(webRes.status);
  res.end(webRes.body ? Buffer.from(await webRes.arrayBuffer()) : null);
}
