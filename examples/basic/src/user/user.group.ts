//@ts-nocheck
import { action, Group } from "@aromix/core";
import { test } from "./test.middlware";
import { userGetInput } from "./user.schema";


@group('test')
export class UserGroup {
  @action("test")
  test() {
    const req = request(userGetInput);

    res.reply({ status: 200 });
  }
}
