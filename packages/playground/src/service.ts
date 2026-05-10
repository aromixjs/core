import { deferred, service } from "@aromix/core";

const userService = service({
   [service.name]: 'user:service',

   [service.lifecycle]: {
      setup() {

      }
   },

   [service.internal]: {
      data: deferred<string[]>([])
   },

   getAll() { }
})





