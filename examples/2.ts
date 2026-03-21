import * as v from "valibot";
import { action, make, group, provide } from "../core";
@group("user")
class UserHandler {
  @action("get")
  async getAllUser() {}

  @action("create")
  async createUser() {}
}

@group("data")
export class DataHandler {
  @action("parse")
  async parse() {}
}

const app = make({
  groups: [UserHandler, DataHandler],
});

console.log(app);

await new Promise((r) => setTimeout(r, 99999));
