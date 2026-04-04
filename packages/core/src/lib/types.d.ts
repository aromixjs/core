export type Union<T extends any[]> = T[number];
export type Maybe<T> = T | undefined;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS"
export type RouteHandler = (req: Request) => Response | Promise<Response>



export interface RouteEntry {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  hooks: Hook[];              
}

export interface AromixDescriptor {
  appStartHooks: Array<Extract<Hook, { event: "app:start" }>>;
  appStopHooks: Array<Extract<Hook, { event: "app:stop" }>>;
  beforeHooks: Array<Extract<Hook, { event: "req:before" }>>;
  afterHooks: Array<Extract<Hook, { event: "req:after" }>>;
  errorHooks: Array<Extract<Hook, { event: "req:error" }>>;
  routes: RouteEntry[];
}