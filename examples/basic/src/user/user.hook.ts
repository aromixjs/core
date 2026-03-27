import { Hook } from "@aromix/core";

export function Logger(): Hook {
  return {
    event: "before:handler",
    run() {
      console.log("test");
    },
  };
}
