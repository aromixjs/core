import { Config } from "../config";
import { BaseCtx } from "../context";

export type RequestHook = (ctx: BaseCtx) => Response | void | Promise<Response | void>;
export type ResponseHook = (ctx: BaseCtx, res: Response) => Response | void | Promise<Response | void>;
export type ErrorHook = (err: unknown, ctx: BaseCtx) => Response | void | Promise<Response | void>;

export type Hook =
	| { on: "Ready"; run: (config: Config) => void | Promise<void> }
	| { on: "Close"; run: (config: Config) => void | Promise<void> }
	| { on: "Request"; run: RequestHook }
	| { on: "Response"; run: ResponseHook }
	| { on: "Error"; run: ErrorHook };
