import { hook, program } from "@aromix/core";

const users = program({
   name: 'users',
   hooks: [




   ]
})




users.command('GetAll', (ctx) => {






})



users.command('Insert', (ctx) => {

   console.log(ctx);



})

users.stream('StreamData', (ctx) => {




   return async (push, done) => {

      push(10)

      push(20)


      done()


   }
})



users.socket('Chats', (ctx) => {

   ctx.send('start', 'hello')


})



console.dir(users);
