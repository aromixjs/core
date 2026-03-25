import { action, getContext, group, inject, RawContext } from "@aromix/core";
import { UserService } from "./user.service";
import { test } from "./test.middlware";
import { test2 } from "./teeset2";
import { userGetInput } from "./user.schema";

@group("user", [test2()])
export class UserGroup {
  private userService = inject(UserService);

  @action("get", [test()])
  async get(ctx: RawContext) {



    return ctx.reply({
      status: 200,
      data: {
        username: "test",
      },
    });
  }
}
