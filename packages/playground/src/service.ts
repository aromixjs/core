import { provide, inject } from "@aromix/core";

@provide()
export class BaseService {
	name = "Base";

	getName() {
		return this.name;
	}
}

@provide()
export class ExtendedService extends BaseService {
	count = 0;

	increment() {
		this.count++;
	}

	get doubleCount() {
		return this.count * 2;
	}
}
