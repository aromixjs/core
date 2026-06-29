import { Db } from "mongodb"

export class MongoDatabase {
  public db!: Db

  constructor() {}

  /** internal attach */
  attach(db: Db) {
    this.db = db
  }

  entity() {
    // placeholder
  }
}