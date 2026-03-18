import { action } from "./action";
import { namespace } from "./namespace";

export interface MakeOptions {
  namespaces: Array<new () => any>;
}

export function make(options: MakeOptions) {
  const orielAdapterDescriptor = new Map<string, Function>();

  options.namespaces.forEach((ns) => {
    const instance: Record<string, unknown> = new ns();
    const nsMeta = namespace.getMeta(instance);
    const actionMeta = action.getMeta(instance);

    if (actionMeta && nsMeta) {
      for (const [key, value] of Object.entries(actionMeta)) {
        orielAdapterDescriptor.set(
          nsMeta.prefix + ":" + value.prefix,
          (instance[key] as Function).bind(instance),
        );
      }
    }

    console.log(orielAdapterDescriptor);
  });
}
