import { program } from "./lib/program";
import { inject, provide } from "./lib/service";


@provide()
class UserService {


   doS(){}
 }






const user = program({
   name: 'user',
   services: [UserService]
})



user.command('getAll', [], () => {



})



user.stream('stream', () => {



})




