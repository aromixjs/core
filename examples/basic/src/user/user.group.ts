import { action, ContextSchema, getContext, group, inject } from "@aromix/core";
import { UserService } from "./user.service";
import { userGetInput } from "./user.schema";


@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const ctx = await getContext(userGetInput);
    return new Response("it works", {
      status: 200,
    });
  }

  @action("create")
  create() {}
}
