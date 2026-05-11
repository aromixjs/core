/**
 * Helper to check if an object has a key (string or symbol).
 */
function hasKey(obj: Record<PropertyKey, unknown>, key: PropertyKey): boolean {
  if (typeof key === "symbol") {
    return Object.getOwnPropertySymbols(obj).includes(key);
  }
  return Object.hasOwn(obj, key);
}

/**
 * Keys from Native prototypes that should not be proxied in the facade.
 */
const NativeKeys = new Set<PropertyKey>([
  ...Object.getOwnPropertyNames(Object.prototype),
  ...Object.getOwnPropertySymbols(Object.prototype),
  ...Object.getOwnPropertyNames(Function.prototype),
  ...Object.getOwnPropertySymbols(Function.prototype),
]);

/**
 * Proxies instance-level properties (own properties) to the target object.
 */
function addInstanceProperties(
  serviceInstance: any,
  targetObj: Record<PropertyKey, unknown>,
) {
  const ownKeys = [
    ...Object.getOwnPropertyNames(serviceInstance),
    ...Object.getOwnPropertySymbols(serviceInstance),
  ];

  for (const key of ownKeys) {
    if (hasKey(targetObj, key)) continue;

    const descriptor = Object.getOwnPropertyDescriptor(serviceInstance, key)!;

    // Skip methods found as own properties (rare but possible)
    if (typeof descriptor.value === "function") continue;
    // Skip getters/setters here; they are usually on the prototype
    if (descriptor.get || descriptor.set) continue;

    Object.defineProperty(targetObj, key, {
      get: () => serviceInstance[key],
      set: (v) => (serviceInstance[key] = v),
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Proxies prototype-level properties and binds methods to the instance.
 */
function addPrototypeProperties(
  serviceInstance: any,
  targetObj: Record<PropertyKey, unknown>,
) {
  let currentProto = Object.getPrototypeOf(serviceInstance);

  while (currentProto && currentProto !== Object.prototype) {
    const protoKeys = [
      ...Object.getOwnPropertyNames(currentProto),
      ...Object.getOwnPropertySymbols(currentProto),
    ];

    for (const key of protoKeys) {
      if (hasKey(targetObj, key)) continue;
      if (NativeKeys.has(key)) continue;

      const descriptor = Object.getOwnPropertyDescriptor(currentProto, key)!;

      if (descriptor.get || descriptor.set) {
        Object.defineProperty(targetObj, key, {
          get: descriptor.get ? () => descriptor.get!.call(serviceInstance) : undefined,
          set: descriptor.set ? (v: any) => descriptor.set!.call(serviceInstance, v) : undefined,
          enumerable: true,
          configurable: true,
        });
      } else if (typeof descriptor.value === "function") {
        targetObj[key] = descriptor.value.bind(serviceInstance);
      }
    }

    currentProto = Object.getPrototypeOf(currentProto);
  }
}

/**
 * Creates a destructurable facade object for a service instance.
 * Methods are bound to the instance, and properties are proxied via getters/setters.
 */
export function createFacadeObj<T extends object>(serviceInstance: any): T {
  const targetObj: any = {};

  addInstanceProperties(serviceInstance, targetObj);
  addPrototypeProperties(serviceInstance, targetObj);

  Object.defineProperty(targetObj, "constructor", {
    get: () => serviceInstance.constructor,
    enumerable: false,
    configurable: true,
  });

  return targetObj;
}
