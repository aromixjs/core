import { input } from "@aromix/core";

function checkAuth() {
  return {
    name: "check-auth",
    async run(next: Function) {
      const ctx = await input();

      return await next();
    },
  };
}
