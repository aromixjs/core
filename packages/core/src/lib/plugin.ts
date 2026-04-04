import { ErrorHook, Hook, RequestHook, ResponseHook } from "./hooks";
import { HttpMethod, RouteHandler } from "./types";

export interface Plugin {
  readonly name: string;
  install: (ctx: PluginContext) => void;
}

export interface PluginContext {
  onStart: (fn: () => void | Promise<void>) => void;
  onStop: (fn: () => void | Promise<void>) => void;

  onBefore: (fn: RequestHook) => void;
  onAfter: (fn: ResponseHook) => void;
  onError: (fn: ErrorHook) => void;

  route: (method: HttpMethod, path: string, handler: RouteHandler, hooks?: Hook[]) => void;

  service: <T>(ctor: new (...args: any[]) => T, factory: () => T) => void;

  use: (plugin: Plugin) => void;
}
