import { action, getContext, group, inject } from "@aromix/core";
import { UserService } from "./user.service";

@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const ctx = await getContext();

    return ctx.reply({
      status: 200,
      data: {
        username: "test",
      },
    });
  }

  @action("create")
  create() {}
}
