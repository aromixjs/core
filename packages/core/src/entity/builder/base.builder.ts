export class BaseBuilder {
	protected narrow<T extends object, K extends keyof T>(self: T, omit: K[]): Omit<T, K> {
		return self as unknown as Omit<T, K>;
	}
}
