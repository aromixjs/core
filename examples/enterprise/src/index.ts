import { make } from "@aromix/core";
import { serve } from "@aromix/node";
import { UserHandler } from "./handlers/user.handler";

/**
 * Enterprise API Example
 * Illustrating modular handler design and complex DI trees.
 */
const app = make({
  groups: [UserHandler],
});

const port = 4000; // Running on 4000 to avoid conflict with basic-api if user runs both
const server = serve(app);

server.listen(port, () => {
    console.log(`🚀 Enterprise API (Complex) up on http://localhost:${port}`);
    console.log(`💡 This example features nested services (Logger -> Database -> UserHandler)`);
});
