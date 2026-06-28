import { MongoClient } from "mongodb";
import { createClient } from "redis";
import { Builder } from "./../src";



const db = Builder.mongo({
   name: 'primary.cluster',
   db: ['root', 'analytics'],
   client() {
      return new MongoClient('')
   },

   onConnect(client) {

   },
   onDisconnect(client) {

   },
   onError(err) {

   }
})


const redis = Builder.redis({
   name: 'primary.caching',
   client() {
      return createClient({
         url: ''
      })
   },
   onConnect(adapter) {

   },
   onDisconnect(adapter) {

   },
   onError(err) {

   }
})



