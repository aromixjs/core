import { serve } from "@aromix/bun";
import { hook, make } from "@aromix/core";
import appConfig from "./app.config";

const readHook = hook('Ready', (config) => {
   console.log(config);

   console.log('app is running in port', config.server.port);
})



const app = make({
   hooks: [readHook]
})


serve(app, appConfig)