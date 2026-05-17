import { createKvStorage, entity } from "@aromix/core";



const redis = createKvStorage({
   async get(key) {
      return 'test'
   },


   async set(key, value) {

   },
   async has(key) {
      return true
   },
   async delete(key) {

   },


})


const sessions =entity({
   name: 'session',
   storage: redis,
   schema(builder) {
      builder.string('user')
      builder.boolean('test')
   },
})
// session:test => { user: 'string', test:true }

const test1 = sessions.get('test')


sessions.set('test',{
   
})