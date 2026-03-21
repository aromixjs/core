import { action } from "./action";
import { group } from "./group";

export interface MakeOptions {
  groups: Array<new () => any>;
}

export interface AromixDescriptor {
  handlers: Map<string, Function>;
}

export function make(options: MakeOptions) {
  const AdapterDescriptor: AromixDescriptor = {
    handlers: new Map<string, Function>(),
  };

  options.groups.forEach((ns) => {
    const instance: Record<string, unknown> = new ns();
    const nsMeta = group.getMeta(instance);
    const actionMeta = action.getMeta(instance);

    if (actionMeta && nsMeta) {
      for (const [key, value] of Object.entries(actionMeta)) {
        AdapterDescriptor.handlers.set(
          nsMeta.prefix + ":" + value.prefix,
          (instance[key] as Function).bind(instance),
        );
      }
    }
  });

  return AdapterDescriptor;
}
