import { Middleware } from "@aromix/core";

export function test2(): Middleware {
  return {
    name: "test2",
    async run(next) {
      console.log("2nd request");

      const data = await next();
      console.log(data);

      return data;
    },
  };
}
