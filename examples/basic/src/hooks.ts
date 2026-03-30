import { Hook, input, output } from "@aromix/core";

export const loggerHook: Hook = {
  event: "before:handler",
  run: () => {
    const raw = input();
    console.log(`→ ${raw.action} from ${raw.ip}`);
  },
};

export const authHook: Hook = {
  event: "before:handler",
  run: () => {
    const raw = input();
    if (!raw.headers["authorization"]) {
      return output("UNAUTHORIZED", "Missing token"); // short-circuit
    }
  },
};

