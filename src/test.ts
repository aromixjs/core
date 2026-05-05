import { Hook, make, program, serve } from "./index";

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