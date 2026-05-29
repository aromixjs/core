import { kv } from "./kv";
import { sqlite } from "./sqlite";

export { KvEntityInput, KvEntityOutput } from './kv'
export { SQLiteEntityOutput, SQLiteEntityInput } from './sqlite'
export const Entity = {
   kv,
   sqlite
}