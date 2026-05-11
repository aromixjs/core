import { provide, inject } from "@aromix/core";

@provide()
class BaseService {
  name = "Base";
  
  getName() {
    return this.name;
  }
}

@provide()
class ExtendedService extends BaseService {
  count = 0;

  increment() {
    this.count++;
  }

  get doubleCount() {
    return this.count * 2;
  }
}

// Test cases
console.log("--- Starting Service Tests ---");

try {
  // 1. Basic Injection
  const base = inject(BaseService);
  console.log("Basic Injection:", base.getName() === "Base" ? "PASS" : "FAIL");

  // 2. Singleton check
  const base2 = inject(BaseService);
  console.log("Singleton Check:", base === base2 ? "PASS" : "FAIL");

  // 3. Facade Destruction (Methods)
  const { getName } = inject.facade(BaseService);
  console.log("Facade Method Binding:", getName() === "Base" ? "PASS" : "FAIL");

  // 4. Facade Property Proxying (Instance Props)
  const facadeExtended = inject.facade(ExtendedService);
  const { increment, count } = facadeExtended;
  
  console.log("Initial Count:", count === 0 ? "PASS" : "FAIL");
  increment();
  console.log("Increment via Facade:", facadeExtended.count === 1 ? "PASS" : "FAIL");
  
  // Note: count from destructuring is a snapshot if it was a primitive at that time 
  // unless we use getters. But the helper uses getters for instance properties too!
  // Wait, let's check addInstanceProperties implementation.
  // It uses Object.defineProperty with get() { return serviceInstance[key] }.
  // So destructuring `const { count } = facadeExtended` SHOULD work as a reactive getter if it's defined that way.
  // Actually, once destructured, `count` is just the value at that moment.
  
  const { count: count2 } = facadeExtended;
  console.log("Destructured Count after increment:", count2 === 1 ? "PASS" : "FAIL");

  // 5. Facade Getters (Prototype)
  console.log("Initial Double Count:", facadeExtended.doubleCount === 2 ? "PASS" : "FAIL");
  facadeExtended.increment();
  console.log("Double Count after increment:", facadeExtended.doubleCount === 4 ? "PASS" : "FAIL");

  // 6. Inheritance
  console.log("Inherited Method via Facade:", facadeExtended.getName() === "Base" ? "PASS" : "FAIL");

  // 7. Non-injectable check
  class NonInjectable {}
  try {
    inject(NonInjectable);
    console.log("Non-injectable Check: FAIL (should have thrown)");
  } catch (e: any) {
    console.log("Non-injectable Check: PASS (" + e.message + ")");
  }

  console.log("--- All Tests Completed ---");
} catch (error) {
  console.error("Test suite failed:", error);
}
