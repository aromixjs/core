import { RequestSchema } from "@aromix/core";
import * as v from "valibot";

export const userGetInput = {
  body: v.object({
    id: v.string(),
  }),
} satisfies RequestSchema;
