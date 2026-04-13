export type RequestHook = (req: Request) => Response | void | Promise<Response | void>;

export type ResponseHook = (req: Request,res:Response) => Response | void | Promise<Response | void>;

export type ErrorHook = (err: unknown, req: Request) => Response | void | Promise<Response | void>;

export type Hook =
  | { on: "Ready"; run: () => void | Promise<void> }
  | { on: "Close"; run: () => void | Promise<void> }
  | { on: "Request"; run: RequestHook }
  | { on: "Response"; run: ResponseHook }
  | { on: "Error"; run: ErrorHook };
