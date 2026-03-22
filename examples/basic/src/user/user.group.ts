import { action, group, inject } from "@aromix/core";
import { UserService } from "./user.service";
@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  get() {
    return {
      status: 200,
      data: "test",
    };
  }

  @action("create")
  create() {}
}
