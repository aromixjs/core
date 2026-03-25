import { getContext, Middleware } from "@aromix/core";

export function test(): Middleware {
  return {
    name: "test",
    async run(next) {
      const ctx = await getContext();

      console.log(ctx);

      console.log("middleware ran");

      return await next();
    },
  };
}
