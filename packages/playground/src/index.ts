import { serve } from "@aromix/bun";
import { Hook, make, program } from "@aromix/core";




const user = program({
   name: 'user'
})



user.command('test', () => {


   return {
      data: "demo"
   }

})


const test: Hook = {

   on: 'Ready',
   run() {
      console.log('app is running in port 3000');

   },
}



const app = make({
   programs: [user],
   hooks: [test]
})



serve(app, {
   port: 3000,
   host: '0.0.0.0'
})