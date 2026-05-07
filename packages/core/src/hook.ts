import { Config } from "./config";

export type RequestHook = (req: Request) => Response | void | Promise<Response | void>;

export type ResponseHook = (req: Request, res: Response) => Response | void | Promise<Response | void>;

export type ErrorHook = (err: unknown, req: Request) => Response | void | Promise<Response | void>;

export type Hook =
  | { on: "Ready"; run: (config: Config) => void | Promise<void> }
  | { on: "Close"; run: (config: Config) => void | Promise<void> }
  | { on: "Request"; run: RequestHook }
  | { on: "Response"; run: ResponseHook }
  | { on: "Error"; run: ErrorHook };


export function hook<T extends Hook["on"]>(
  on: T,
  run: Extract<Hook, { on: T }>["run"]
): Extract<Hook, { on: T }> {
  return { on, run } as Extract<Hook, { on: T }>
}