
const MetaKey = Symbol("aromix:meta");

const Registry = new Map<symbol, unknown>();

export type Token<T> = symbol & { readonly __type: T };
export const createToken = <T>(name: string) => Symbol(name) as Token<T>;

export function provide(): ClassDecorator {
  return (target: any) => {
    target[MetaKey] = createToken(`service:${target.name ?? "Anonymous"}`);
  };
}

function tokenOf<T>(ctor: new (...args: any[]) => T): Token<T> | undefined {
  return (ctor as any)[MetaKey];
}

type Ctor<T> = new (...args: any[]) => T;

export function inject<T>(ctor: Ctor<T>): T;
export function inject<T>(token: Token<T>): T;
export function inject<T>(target: Ctor<T> | Token<T>): T {
  if (typeof target === "function") {
    const token = tokenOf(target);
    if (!token) throw new Error(`@provide() missing on "${target.name}"`);
    if (!Registry.has(token)) Registry.set(token, new target());
    return Registry.get(token) as T;
  }
  if (!Registry.has(target))
    throw new Error(`No value for token "${target.description}"`);
  return Registry.get(target) as T;
}

export const injectNew = <T>(ctor: Ctor<T>): T => new ctor();

export const register = <T>(token: Token<T>, value: T) =>
  Registry.set(token, value);
