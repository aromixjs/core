import { inject, provide } from "@aromix/core";

@provide()
class Test {


   readonly data = 10;



   get Test() {

      return this.data

   }


}



const testService = inject(Test)

console.log(testService.data);
console.log(testService.Test);

