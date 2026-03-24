import { action, group, inject, input, InputSchema } from "@aromix/core";
import { UserService } from "./user.service";
import * as v from "valibot";

const userGetInput = {
  body: v.object({
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
  }),
  headers: v.object({
    "x-action": v.string(),
  }),
} satisfies InputSchema;

@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const ctx = await input(userGetInput);

    console.log(ctx.body.email);



    return new Response("it works", {
      status: 200,
    });
  }

  @action("create")
  create() {}
}
