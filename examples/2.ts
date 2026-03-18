import * as v from "valibot";
import { action, make, namespace } from "../core";

@namespace("user")
class UserHandler {
  @action("get")
  async getAllUser() {}

  @action("create")
  async createUser() {}
}

make({
  namespaces: [UserHandler],
});

await new Promise((r) => setTimeout(r, 99999));
