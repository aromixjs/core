import { describe, expect, it } from "vitest";
import { object } from "./../src";

describe("ObjectBuilder", () => {
	describe("patch()", () => {
		it("should shallow merge primitive values", () => {
			const result = object({ name: "John", age: 20 }).patch({ age: 30 }).value();

			expect(result).toEqual({ name: "John", age: 30 });
		});

		it("should deep merge nested objects", () => {
			const result = object({ user: { name: "John", settings: { theme: "dark", notifications: true } } })
				.patch({ user: { settings: { notifications: false } } }).value();

			expect(result).toEqual({ user: { name: "John", settings: { theme: "dark", notifications: false } } });
		});

		it("should replace arrays instead of merging them", () => {
			const result = object({ items: [1, 2, 3] }).patch({ items: [4, 5] }).value();

			expect(result).toEqual({ items: [4, 5] });
		});

		it("should ignore undefined values", () => {
			const result = object({ name: "John", age: 20 }).patch({ name: undefined }).value();

			expect(result).toEqual({ name: "John", age: 20 });
		});

		it("should allow null assignment", () => {
			const result = object({ user: { name: "John" } }).patch({ user: null as any }).value();

			expect(result).toEqual({ user: null });
		});

		it("should not mutate original object", () => {
			const base = { user: { name: "John" } };

			const result = object(base).patch({ user: { name: "Jane" } });

			expect(base).toEqual({ user: { name: "John" } });

			expect(result.value()).toEqual({ user: { name: "Jane" } });
		});
	});

	describe("omit()", () => {
		it("should remove keys", () => {
			const result = object({ id: 1, name: "John", email: "john@example.com" }).omit(["email"]).value();

			expect(result).toEqual({ id: 1, name: "John" });
		});

		it("should support multiple keys", () => {
			const result = object({ id: 1, name: "John", email: "john@example.com" }).omit(["id", "email"])
				.value();

			expect(result).toEqual({ name: "John" });
		});
	});

	describe("pick()", () => {
		it("should pick selected keys", () => {
			const result = object({ id: 1, name: "John", email: "john@example.com" }).pick(["name"]).value();

			expect(result).toEqual({ name: "John" });
		});

		it("should support multiple keys", () => {
			const result = object({ id: 1, name: "John", email: "john@example.com" }).pick(["id", "email"])
				.value();

			expect(result).toEqual({ id: 1, email: "john@example.com" });
		});
	});

	describe("defaults()", () => {
		it("should apply fallback values", () => {
			const result = object({ name: "John", age: undefined as number | undefined }).defaults({ age: 20 })
				.value();

			expect(result).toEqual({ name: "John", age: 20 });
		});

		it("should not overwrite existing values", () => {
			const result = object({ name: "John", age: 30 }).defaults({ age: 20 }).value();

			expect(result).toEqual({ name: "John", age: 30 });
		});
	});

	describe("mapValues()", () => {
		it("should map all values", () => {
			const result = object({ a: 1, b: 2, c: 3 }).mapValues((v) => v * 2).value();

			expect(result).toEqual({ a: 2, b: 4, c: 6 });
		});

		it("should provide key to mapper", () => {
			const result = object({ a: 1, b: 2 }).mapValues((v, k) => `${String(k)}:${v}`).value();

			expect(result).toEqual({ a: "a:1", b: "b:2" });
		});
	});

	describe("mapKeys()", () => {
		it("should map keys", () => {
			const result = object({ firstName: "John", lastName: "Doe" }).mapKeys((k) =>
				k.toString().toUpperCase()
			).value();

			expect(result).toEqual({ FIRSTNAME: "John", LASTNAME: "Doe" });
		});

		it("should preserve values", () => {
			const result = object({ a: 1, b: 2 }).mapKeys((k) => `${String(k)}Key`).value();

			expect(result).toEqual({ aKey: 1, bKey: 2 });
		});
	});

	describe("filter()", () => {
		it("should filter values", () => {
			const result = object({ a: 1, b: 2, c: 3 }).filter((v) => v > 1).value();

			expect(result).toEqual({ b: 2, c: 3 });
		});

		it("should provide key to predicate", () => {
			const result = object({ name: "John", age: 20 }).filter((_, key) => key === "name").value();

			expect(result).toEqual({ name: "John" });
		});
	});

	describe("clone()", () => {
		it("should deeply clone object", () => {
			const original = object({ user: { name: "John" } });

			const cloned = original.clone();

			cloned.value().user.name = "Jane";

			expect(original.value()).toEqual({ user: { name: "John" } });

			expect(cloned.value()).toEqual({ user: { name: "Jane" } });
		});
	});

	describe("chainability", () => {
		it("should support fluent chaining", () => {
			const result = object({ id: 1, name: "John", email: "john@example.com", active: true }).patch({
				name: "Jane",
			}).omit(["email"]).mapValues((v) => String(v)).value();

			expect(result).toEqual({ id: "1", name: "Jane", active: "true" });
		});
	});

	describe("edge cases", () => {
		it("should handle empty objects", () => {
			const result = object({}).patch({}).value();

			expect(result).toEqual({});
		});

		it("should handle symbol keys in mapKeys()", () => {
			const result = object({ a: 1 }).mapKeys(() => Symbol("x")).value();

			const symbols = Object.getOwnPropertySymbols(result);

			expect(symbols).toHaveLength(1);
			expect(result[symbols[0]]).toBe(1);
		});

		it("should handle nested partial patching", () => {
			const result = object({ config: { ui: { theme: "dark", fontSize: 14 }, api: { url: "/api" } } })
				.patch({ config: { ui: { fontSize: 16 } } }).value();

			expect(result).toEqual({ config: { ui: { theme: "dark", fontSize: 16 }, api: { url: "/api" } } });
		});
	});
});
