import { Hook, make, program } from "@aromix/core";
import { serve } from "@aromix/bun";

const users = program({
   name: 'users'
})



users.command('GetAll', (ctx) => {
   console.log(ctx);


   return {
      test: 'data',
      data: ctx.payload
   }

})




const appStart: Hook = {
   on: 'Ready',
   run() {
      console.log('App Started');

   },
}





const app = make({
   programs: [users],
   hooks: [appStart]
})





serve(app, {
   port: 3000,
   host: '0.0.0.0'
})