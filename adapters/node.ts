import { createServer } from "node:http";
import { AromixDescriptor } from "../core/make";
import { AsyncLocalStorage } from "node:async_hooks";

export interface RawRequest {
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
  action: string;
}

export const requestStorage = new AsyncLocalStorage<RawRequest>();

export function serve(descriptor: AromixDescriptor) {
  const server = createServer(async (req, res) => {
    const action = req.headers["x-action"] as string | undefined;

    if (!action || !descriptor.handlers.has(action)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Action not found" }));
      return;
    }

    const body = await new Promise<unknown>((resolve) => {
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

    const raw: RawRequest = {
      body,
      headers: req.headers,
      ip: req.socket.remoteAddress ?? "",
      action,
    };

    const handler = descriptor.handlers.get(action)!;
    const result = await requestStorage.run(raw, () => handler());

    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(
      result.data !== undefined ? JSON.stringify(result.data) : undefined,
    );
  });

  return server;
}
