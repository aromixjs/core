import {
  AromixDescriptor,
  RawRequest,
  ResponseBuilder,
  runChain,
} from "@aromix/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { TLSSocket } from "node:tls";
import { parseBody, parseCookies, toWebRequest } from "./utils";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Get the request url
      const protocol = req.socket instanceof TLSSocket ? "https" : "http";
      const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

      // convert to web request
      const webReq = toWebRequest(fullUrl.href, req);
      const action = webReq.headers.get("x-action");

      if (!action || !descriptor.handlers.has(action)) {
        res.statusCode = 404;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Action not found" }));
        return;
      }

      const body: RawRequest = {
        body: await parseBody(webReq),
        headers: Object.fromEntries(webReq.headers.entries()),
        cookies: parseCookies(webReq.headers.get("cookie")),
        ip: req.socket.remoteAddress ?? "",
        action,
      };

      const entry = descriptor.handlers.get(action)!;
      const payload = await runChain(entry.chain, body, entry.handler);

      if (!(payload instanceof ResponseBuilder)) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: "Handler did not return a response" }));
        return;
      }

      const reply = payload.toReplyValue();
      res.statusCode = reply.status;

      for (const [k, v] of Object.entries(reply.headers)) {
        res.setHeader(k, v);
      }

      if (reply.data !== undefined) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(reply.data));
      } else {
        res.end();
      }
    },
  );

  return server;
}
