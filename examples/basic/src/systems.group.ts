import { action, group, input, InputSchema } from "@aromix/core";
import * as v from "valibot";

const body: InputSchema = {
  body: v.object({
    data: v.file(),
  }),
};

@group("#")
export class SystemsGroup {
  @action("catchAll")
  catchAll() {
    const ctx = input(body);
    ctx.headers;
  }

  @action("docs")
  docs() {}

  @action("health-check")
  healthCheck() {}




  
}
