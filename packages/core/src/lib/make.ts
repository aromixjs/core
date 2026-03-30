import { action } from "./action";
import { group } from "./group";
import { Hook } from "./hooks";
import { Output } from "./send";

export interface MakeOptions {
  groups: Array<new () => any>;
  hooks?: Hook[];
}

export interface AromixDescriptor {
  handlers: Map<
    string,
    {
      handler: () => Promise<Output>;
      beforeHandlerHooks: Extract<Hook, { event: "before:handler" }>[];
      afterHandlerHooks: Extract<Hook, { event: "after:handler" }>[];
      errorHooks: Extract<Hook, { event: "error" }>[];
    }
  >;
  appStartHooks: Extract<Hook, { event: "app:start" }>[];
  appStopHooks: Extract<Hook, { event: "app:stop" }>[];
}

export function make(options: MakeOptions): AromixDescriptor {
  const descriptor: AromixDescriptor = {
    handlers: new Map(),
    appStartHooks: [],
    appStopHooks: [],
  };

  // global hooks
  const globalBeforeHandlerHooks = options.hooks?.filter((h) => h.event === "before:handler") ?? [];
  const globalAfterHandlerHooks = options.hooks?.filter((h) => h.event === "after:handler") ?? [];
  const globalErrorHooks = options.hooks?.filter((h) => h.event === "error") ?? [];
  const globalAppStartHooks = options.hooks?.filter((h) => h.event === "app:start") ?? [];
  const globalAppStopHooks = options.hooks?.filter((h) => h.event === "app:stop") ?? [];

  // collect app-level appStart/appStop hooks
  descriptor.appStartHooks.push(...globalAppStartHooks);
  descriptor.appStopHooks.push(...globalAppStopHooks);

  for (const GroupClass of options.groups) {
    const instance = new GroupClass();

    const groupMeta = group.getMeta(instance);
    const actionMap = action.getMeta(instance);

    if (!groupMeta || !actionMap) continue;

    // group-level hooks
    const groupBeforeHandlerHooks = groupMeta.hooks?.filter((h) => h.event === "before:handler") ?? [];
    const groupAfterHandlerHooks = groupMeta.hooks?.filter((h) => h.event === "after:handler") ?? [];
    const groupErrorHooks = groupMeta.hooks?.filter((h) => h.event === "error") ?? [];
    const groupAppStartHooks = groupMeta.hooks?.filter((h) => h.event === "app:start") ?? [];
    const groupAppStopHooks = groupMeta.hooks?.filter((h) => h.event === "app:stop") ?? [];

    // collect group-level appStart/appStop hooks
    descriptor.appStartHooks.push(...groupAppStartHooks);
    descriptor.appStopHooks.push(...groupAppStopHooks);

    for (const [methodKey, actionMeta] of Object.entries(actionMap)) {
      const fullKey = `${groupMeta.prefix}:${actionMeta.prefix}`;

      // action-level hooks
      const actionBeforeHandlerHooks = actionMeta.hooks?.filter((h) => h.event === "before:handler") ?? [];
      const actionAfterHandlerHooks = actionMeta.hooks?.filter((h) => h.event === "after:handler") ?? [];
      const actionErrorHooks = actionMeta.hooks?.filter((h) => h.event === "error") ?? [];
      const actionAppStartHooks = actionMeta.hooks?.filter((h) => h.event === "app:start") ?? [];
      const actionAppStopHooks = actionMeta.hooks?.filter((h) => h.event === "app:stop") ?? [];
      // collect action-level appStart/appStop hooks
      descriptor.appStartHooks.push(...actionAppStartHooks);
      descriptor.appStopHooks.push(...actionAppStopHooks);

      /**
       * Hook flow (onion pattern):
       *
       * before:handler  → make → group → action
       * after:handler   → action → group → make
       * error           → action → group → make (stop if handled)
       *
       * app:start/stop  → run all hooks (no scope)
       * global errors   → only make-level hooks
       */
      descriptor.handlers.set(fullKey, {
        handler: () => (instance[methodKey] as Function).call(instance),
        beforeHandlerHooks: [...globalBeforeHandlerHooks, ...groupBeforeHandlerHooks, ...actionBeforeHandlerHooks],
        afterHandlerHooks: [...actionAfterHandlerHooks, ...groupAfterHandlerHooks, ...globalAfterHandlerHooks],
        errorHooks: [...actionErrorHooks, ...groupErrorHooks, ...globalErrorHooks],
      });
    }
  }

  return descriptor;
}
