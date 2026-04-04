export type RequestHook = (req: Request) => Request | Response | void | Promise<Request | Response | void>;
export type ResponseHook = (res: Response, req: Request) => Response | void | Promise<Response | void>;
export type ErrorHook = (err: unknown, req: Request) => Response | void | Promise<Response | void>;

export type Hook =
  | { event: "app:start"; fn: () => void | Promise<void> }
  | { event: "app:stop"; fn: () => void | Promise<void> }
  | { event: "req:before"; fn: RequestHook }
  | { event: "req:after"; fn: ResponseHook }
  | { event: "req:error"; fn: ErrorHook };
