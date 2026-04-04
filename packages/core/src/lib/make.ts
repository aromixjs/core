import { Hook } from "./hooks";

export interface MakeOptions {
  hooks?: Hook[];
}

export interface AromixDescriptor {
  appStartHooks: Extract<Hook, { event: "app:start" }>[];
  appStopHooks: Extract<Hook, { event: "app:stop" }>[];
  errorHooks: Extract<Hook, { event: "error" }>[];
}

export function make(options: MakeOptions = {}): AromixDescriptor {
  const descriptor: AromixDescriptor = {
    appStartHooks: [],
    appStopHooks: [],
    errorHooks: [],
  };

  for (const h of options.hooks ?? []) {
    if (h.event === "app:start") descriptor.appStartHooks.push(h);
    if (h.event === "app:stop") descriptor.appStopHooks.push(h);
    if (h.event === "error") descriptor.errorHooks.push(h);
  }

  return descriptor;
}
