import { createKvStorage, defineKv, entity, kv } from "@aromix/core";

const redis = createKvStorage({
	async get(key) {
		return "test";
	},

	async set(key, value) { },
	async has(key) {
		return true;
	},
	async delete(key) { },
});

const sessions = entity({
	name: "session",
	storage: redis,
	schema: defineKv({
		user: kv.string(),
		meta: kv.object({
			page: kv.string()
		})
	})
});
// session:test => { user: 'string', test:true }


const test1 = await sessions.get("test");

// sessions.set('test', {

// })

console.log(sessions);



sessions.set('tyest', {

})