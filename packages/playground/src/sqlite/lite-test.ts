import { lite } from "@aromix/sqlite";

export const UserTable = lite.table({
  id: lite.int().primaryKey().autoIncrement(),
  name: lite.text().notNull().unique(),
  email: lite.text().notNull().unique(),
  age: lite.int().default(0),
  score: lite.real().default(0.0),
  isActive: lite.bool().default(true),
  bio: lite.text().default(""),
  avatar: lite.blob(),
  balance: lite.bigint().default(0n),
  createdAt: lite.date("iso").notNull(),
  updatedAt: lite.date("unix-ms"),
});

export const PostTable = lite.table({
  id: lite.int().primaryKey().autoIncrement(),
  userId: lite.int().notNull().references("UserTable", "id", ["on-delete:cascade", "on-update:cascade"]),
  title: lite.text().notNull(),
  body: lite.text().notNull(),
  published: lite.bool().default(false),
  publishedAt: lite.date("iso"),
  collatedTitle: lite.text().collate("nocase"),
});

export const CompositeKeyTable = lite.table({
  tenantId: lite.int().notNull(),
  userId: lite.int().notNull(),
  role: lite.text().notNull(),
}).model.id = undefined as any;

export const TagTable = lite.table({
  id: lite.int().primaryKey().autoIncrement(),
  name: lite.text().notNull().unique(),
  label: lite.text().unique("ignore"),
});

export const OrderTable = lite.table({
  id: lite.int().primaryKey().autoIncrement(),
  userId: lite.int().notNull().references("UserTable", "id", ["on-delete:set-null"]),
  total: lite.real().notNull(),
  currency: lite.text().default("USD"),
  notes: lite.text().collate("rtrim"),
});