const MetaKey = Symbol("aromix:meta");
const Registry = new Map<symbol, unknown>();

export type Service<T = unknown> = new (...args: any[]) => T;

export function provide(): ClassDecorator {
   return (target) => {
      (target as any)[MetaKey] = Symbol("service:" + target.name);
   };
}

export function inject<T>(service: Service<T>): T {
   const token = (service as any)[MetaKey] as symbol | undefined;
   if (!token) throw new Error('No Token Found in' + service.name);
   if (!Registry.has(token)) Registry.set(token, new service());
   return Registry.get(token) as T;
}