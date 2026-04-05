import { make } from "@aromix/core";
import { serve } from "@aromix/bun";
import { UserHandler } from "./handlers/user.handler";

/**
 * Enterprise API Example
 * Illustrating modular handler design and complex DI trees.
 */
const app = make({
  groups: [UserHandler],
});

serve(app, { port: 4000 });
console.log(`🚀 Enterprise API (Complex) up on http://localhost:${4000}`);
console.log(`💡 This example features nested services (Logger -> Database -> UserHandler)`);
