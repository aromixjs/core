import { ContextSchema } from "@aromix/core";
import * as v from "valibot";

export const userGetInput = {
  body: v.object({
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
  }),
  headers: v.object({
    "x-action": v.string(),
  }),
} satisfies ContextSchema;
