import { createFacadeObj } from "./facade";

const ServiceToken = Symbol.for("aromix.service.token");
const ServiceRegistry = new Map<any, any>();

export type ServiceConstructor<T> = new (...args: any[]) => T;

export interface Setup {
	setup(): void | Promise<void>;
}
export interface Teardown {
	teardown(): void | Promise<void>;
}
export interface Lifecycle extends Setup, Teardown {}

/**
 * Marks a class as an injectable service.
 */
export function provide(): ClassDecorator {
	return (target: any) => {
		const token = crypto.randomUUID();
		target[ServiceToken] = token;
	};
}

/**
 * Resolves a service singleton instance.
 * Throws if the class is not decorated with @provide().
 */
export function inject<T>(Service: ServiceConstructor<T>): T {
	//@ts-ignore
	const token = Service[ServiceToken];

	if (!token) {
		throw new Error(`Class ${Service.name} is not marked as injectable. Use @provide().`);
	}

	if (!ServiceRegistry.has(token)) {
		ServiceRegistry.set(Service, new Service());
	}

	let instance = ServiceRegistry.get(Service);
	return instance;
}

/**
 * Returns a destructurable facade of the service instance.
 * Methods remain bound .
 */
inject.facade = <T extends object>(Service: ServiceConstructor<T>): T => {
	const instance = inject(Service);
	return createFacadeObj<T>(instance);
};
