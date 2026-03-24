import { action, group, inject, input } from "@aromix/core";
import { UserService } from "./user.service";
@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  get() {
    const ctx = input();

    console.log(ctx);

    return new Response("it works", {
      status: 200,
    });
  }

  @action("create")
  create() {}
}
