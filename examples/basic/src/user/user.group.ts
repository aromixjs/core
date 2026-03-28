import { group, action, request, response, inject, match, matchErr } from "@aromix/core";
import { UserService } from "./user.service";
import { userGetInput } from "./user.schema";

@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const { body } = await request.validate(userGetInput);
    const user = this.userService.findById(body.id);

    return match(user, {
      not_found: () => {
        return response.notFound('user Not Found');
      },
      suspended: () => {
        return response.unauthorized("fail");
      },
      ok: (data) => {
        return response.notFound("");
      },
    });
  }
}
