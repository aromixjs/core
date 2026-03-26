import { Middleware } from "@aromix/core";

export function checkRole(role: string): Middleware {
  return {
    name: "check role",
    async run(next) {
     return await next();
    },
  };
}
