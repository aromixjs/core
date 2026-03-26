import { action, group, inject, request, response } from "@aromix/core";
import { UserService } from "./user.service";

@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  get() {
    const raw = request();

    const userResult = this.userService.findById(10);

    if (!userResult.ok && userResult.err === "not_found") {
      return response.notFound("user not found");
    }

    return response.setHeader("x-power-by", "aromix").ok({
      data: "ok",
      raw,
    });
  }
}
