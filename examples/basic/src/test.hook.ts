import { Hook, response } from "@aromix/core";

export function handleError(): Hook {
  return {
    event: "error",
    run(error) {
      return response.ok("ok");
    },
  };
}
