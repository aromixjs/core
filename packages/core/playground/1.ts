import { MongoClient } from "mongodb";
import { mongo } from "./../src";

export const cluster1 = mongo({
   name: "primary.cluster",
   client() {
      return new MongoClient('')
   },
   db: ['root']
})



cluster1.root.entity()