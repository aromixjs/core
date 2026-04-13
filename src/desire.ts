import { provide } from "./lib/di";
import { createRouter } from "./lib/router";

const router=createRouter()



router.on('/').render()



function expose():MethodDecorator {
  


  return (args)=>{

  }
}



@provide()
class Test{



@expose()
getAll(){



}

}