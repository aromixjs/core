import { entity } from "@aromix/core";

entity({
	schema: (builder) => {
		builder.integer("id").primary();
		builder.string("username").notNullable().unique();
		builder.string("passwordHash").notNullable();
	},
});
