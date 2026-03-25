import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  AromixDescriptor,
  contextStorage,
  RawContext,
} from "@aromix/core";
import { TLSSocket } from "node:tls";
import { parseBody, toWebRequest, writeNodeResponse } from "./utils";

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const [k, ...v] = pair.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    }),
  );
}

export function serve(descriptor: AromixDescriptor) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Get the request url
    const protocol = req.socket instanceof TLSSocket ? "https" : "http";
    const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

    // convert to web request
    const webReq = toWebRequest(fullUrl.href, req);

    const action = webReq.headers.get("x-action");

    if (!action || !descriptor.handlers.has(action)) {
      await writeNodeResponse(res, {
        _type: "reply",
        status: 404,
        data: { error: "Action not found" },
      });
      return;
    }

    const body = await parseBody(webReq);
    const context: RawContext = {
      body,
      headers: Object.fromEntries(webReq.headers.entries()),
      cookies: parseCookies(webReq.headers.get("cookie")),
      ip: req.socket.remoteAddress ?? "",
      action,
      reply: (options) =>
        Object.freeze({ _type: "reply" as const, ...options }),
    };

    const handler = descriptor.handlers.get(action)!;
    const payload = await contextStorage.run(context, () => handler());

    if (!payload || payload._type !== "reply") {
      await writeNodeResponse(res, {
        _type: "reply",
        status: 500,
        data: { error: "Handler did not return a reply value" },
      });
      return;
    }

    await writeNodeResponse(res, payload);
  });
}
