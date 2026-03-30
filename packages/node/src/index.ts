import { ActionNotFoundError, AromixDescriptor, requestStorage } from "@aromix/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { parseIncoming, writeResponse } from "./utils";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req: IncomingMessage, serverRes: ServerResponse) => {
    const raw = await parseIncoming(req);
    const entry = descriptor.handlers.get(raw.action);
    if (!entry) throw new ActionNotFoundError(raw.action);

    const result = await requestStorage.run(raw, async () => {
      let output: any;

      for (const hook of entry.beforeHandlerHooks) {
        const short = await hook.run();
        if (short !== undefined) {
          output = short;
          break;
        }
      }

      if (output === undefined) {
        output = await entry.handler();
      }

      for (const hook of entry.afterHandlerHooks) {
        const override = await hook.run(output);
        if (override !== undefined) output = override;
      }

      return output;
    });

    writeResponse(serverRes, result);
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
