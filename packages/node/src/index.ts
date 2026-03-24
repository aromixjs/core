import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { AromixDescriptor, contextStorage, RequestContext } from "@aromix/core";
import { TLSSocket } from "node:tls";
import { parseBody, toWebRequest, writeNodeResponse } from "./utils";

export function serve(descriptor: AromixDescriptor) {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Get the request url
    const protocol = req.socket instanceof TLSSocket ? "https" : "http";
    const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);

    // convert to web request
    const webReq = toWebRequest(fullUrl.href, req);

    const action = webReq.headers.get("x-action");

    if (!action || !descriptor.handlers.has(action)) {
      await writeNodeResponse(
        res,
        Response.json({ error: "Action not found" }, { status: 404 }),
      );
      return;
    }


    const body = await parseBody(webReq);

    const context: RequestContext = {
      body,
      headers: Object.fromEntries(webReq.headers.entries()),
    };

    const handler = descriptor.handlers.get(action)!;
    const payload = await contextStorage.run(context, () => handler());

    await writeNodeResponse(res, payload);
  });
}
