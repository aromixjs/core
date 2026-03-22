import { createServer, IncomingMessage } from "node:http";
import { AromixDescriptor } from "@aromix/core";
import { AsyncLocalStorage } from "node:async_hooks";
import { RequestContext, ResponseMethods, ResponsePayload } from "./types";

export const requestStorage = new AsyncLocalStorage<RequestContext>();

function buildResponseMethods(): ResponseMethods {
  return {
    send: ({ status, data }) => ({ status, data }),
    end: (status = 204) => ({ status }),
    redirect: (url, status = 302) => ({ status, redirect: url }),
  };
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

function writeResponse(
  res: import("node:http").ServerResponse,
  payload: ResponsePayload,
) {
  if (payload.redirect) {
    res.writeHead(payload.status, { Location: payload.redirect });
    res.end();
    return;
  }

  if (payload.data === undefined) {
    res.writeHead(payload.status);
    res.end();
    return;
  }

  const isText = typeof payload.data === "string";
  const contentType = isText ? "text/plain" : "application/json";
  const body = isText ? payload.data : JSON.stringify(payload.data);

  res.writeHead(payload.status, { "Content-Type": contentType });
  res.end(body);
}

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req, res) => {
    const action = req.headers["x-action"] as string | undefined;

    if (!action || !descriptor.handlers.has(action)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Action not found" }));
      return;
    }

    const body = await readBody(req);

    const context: RequestContext = {
      body,
      headers: req.headers,
      ip: req.socket.remoteAddress ?? "",
      action,
      ...buildResponseMethods(),
    };

    const handler = descriptor.handlers.get(action)!;
    const payload = await requestStorage.run(context, () => handler());

    writeResponse(res, payload);
  });

  return server;
}
