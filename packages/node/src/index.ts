import { ActionNotFoundError, AromixDescriptor, packetStorage, Send } from "@aromix/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { parseIncoming, writeResponse } from "./utils";

export function serve(descriptor: AromixDescriptor) {
  const server = createServer();

  server.on("request", async (req: IncomingMessage, serverRes: ServerResponse) => {
    let entry: ReturnType<AromixDescriptor["handlers"]["get"]>;

    try {
      const raw = await parseIncoming(req);
      entry = descriptor.handlers.get(raw.action);
      if (!entry) throw new ActionNotFoundError(raw.action);
      const definedEntry = entry;

      const result = await packetStorage.run(raw, async () => {
        let output: Send | void = undefined;

        for (const hook of definedEntry.beforeHandlerHooks) {
          const short = await hook.run();
          if (short !== undefined) {
            output = short;
            break;
          }
        }

        if (output === undefined) {
          output = await definedEntry.handler();
        }
        for (const hook of definedEntry.afterHandlerHooks) {
          const override = await hook.run(output as Send);
          if (override !== undefined) output = override;
        }

        return output;
      });

      writeResponse(serverRes, result);
    } catch (error) {
      const errorHooks = entry?.errorHooks ?? [];
      let handled: Send | undefined;

      for (const hook of errorHooks) {
        try {
          const out = await hook.run(error);
          if (out !== undefined) {
            handled = out;
            break;
          }
        } catch {
          continue;
        }
      }

      writeResponse(
        serverRes,
        handled ?? {
          data: null,
          errors: [{ message: "Something went wrong" }],
        }
      );
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
