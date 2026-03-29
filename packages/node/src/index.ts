import {
  ActionNotFoundError,
  AromixDescriptor,
  InvalidResponseError,
  Output,
  RawRequest,
  requestStorage,
} from "@aromix/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { TLSSocket } from "node:tls";
import { parseBody, parseCookies, toWebRequest, writeResponse } from "./utils";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req: IncomingMessage, serverRes: ServerResponse) => {
    const protocol = req.socket instanceof TLSSocket ? "https" : "http";
    const fullUrl = new URL(req.url!, `${protocol}://${req.headers.host}`);
    const webReq = toWebRequest(fullUrl.href, req);
    const action = webReq.headers.get("x-action");
    const entry = action ? descriptor.handlers.get(action) : undefined;

    try {
      if (!action || !entry) throw new ActionNotFoundError(action ?? "unknown");

      const raw: RawRequest = {
        body: await parseBody(webReq),
        headers: Object.fromEntries(webReq.headers.entries()),
        cookies: parseCookies(webReq.headers.get("cookie")),
        ip: req.socket.remoteAddress ?? "",
        action,
      };

      const result = await requestStorage.run(raw, async () => {
        let builder: Output;

        // short circuit if before handler returns any value
        for (const hook of entry.beforeHandlerHooks) {
          const short = await hook.run();
          if (short !== undefined) {
            builder = short;
            break;
          }
        }

        if (!builder!) {
          const handlerResult = await entry.handler();

          // handler returned something other than Output
          if (typeof handlerResult !== "object" || handlerResult === null || !("ok" in handlerResult)) {
            throw new InvalidResponseError(`Handler '${action}' must return an Output.`);
          }

          builder = handlerResult;
        }

        for (const hook of entry.afterHandlerHooks) {
          const override = await hook.run(builder);

          if (override !== undefined) {
            builder = override;
          }
        }

        return builder;
      });

      writeResponse(serverRes, result);
    } catch (error) {
      const errorHooks = entry?.errorHooks ?? [];
      let result: Output | undefined;

      for (const hook of errorHooks) {
        try {
          const handled = await hook.run(error);
          if (handled !== undefined) {
            result = handled;
            break;
          }
        } catch {
          continue;
        }
      }

      const fallback: Output = result ?? {
        ok: false,
        code: "INTERNAL",
        data: null,
        error: "Something went wrong",
      };

      writeResponse(serverRes, fallback);
    }
  });

  server.on("listening", async () => {
    for (const hook of descriptor.appStartHooks) {
      await hook.run();
    }
  });

  server.on("close", async () => {
    for (const hook of descriptor.appStopHooks) {
      await hook.run();
    }
  });

  return server;
}
