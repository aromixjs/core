import { make } from "@aromix/core";
import { serve } from "@aromix/node";
import { UserModule } from "./modules/user.module";

/**
 * Configure the Aromix Application by registering modules/groups.
 * Each module will contribute its actions to the handler map.
 */
const aromixApp = make({
  groups: [UserModule], // Register your @group() classes here
});

/**
 * Boot up the server using our Node.js adapter.
 * Aromix is adapter-agnostic, meaning the same 'aromixApp' could theoretically run
 * on Cloudflare Workers, Deno, Bun, or Fastify.
 */
const port = 3000;
const server = serve(aromixApp);

server.listen(port, () => {
  console.log("");
  console.log("🚀 Aromix Basic API starting...");
  console.log(`📡 Listening at http://localhost:${port}`);
  console.log("-----------------------------------------");
  console.log("Example interaction (using cURL):");
  console.log(`curl -X POST -H "x-action: user:profile" http://localhost:${port}`);
  console.log("");
  console.log(`📝 Check UserModule in src/modules/user.module.ts for action implementation.`);
});
