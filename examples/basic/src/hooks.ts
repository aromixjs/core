import { Hook, request, response } from "@aromix/core";

export const loggerHook: Hook = {
  event: "before:handler",
  run: () => {
    const raw = request();
    console.log(`→ ${raw.action} from ${raw.ip}`);
  },
};

export const authHook: Hook = {
  event: "before:handler",
  run: () => {
    const raw = request();
    if (!raw.headers["authorization"]) {
      return response.unauthorized("Missing token"); // short-circuit
    }
  },
};

export function ResponseLogger(): Hook {
  return {
    event: "after:handler",
    run(builder) {
      console.log('response ->',builder.toReplyValue());
    },
  };
}
