import { Mongo, MongoInput } from "./mongo"
import { Redis, RedisInput } from "./redis"

export const Builder = {

   mongo(input: MongoInput) {
      return new Mongo(input)
   },



   redis(input: RedisInput) {
      return new Redis(input)
   }

}