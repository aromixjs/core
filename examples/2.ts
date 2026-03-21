import * as v from "valibot";
import { action, make, group, provide } from "../core";
import { requestStorage, serve } from "../adapters/node";
import { AsyncLocalStorage } from "node:async_hooks";
@group("user")
class UserHandler {
  @action("get")
  async getAllUser() {
    const data = requestStorage.getStore();
    console.log(data);

    return {
      status: 200,
      data: "this works",
    };
  }

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

serve(app).listen(3000, () => {
  console.log("test");
});
