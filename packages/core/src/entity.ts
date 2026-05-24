import { Storage } from "./storage";
interface EntityConfig<T> {
   name: string;
   storage: Storage.KV;
   guards?: any[];
   effects?: any[];
   model: {
      base: { $infer: T };
      computed: (data: T) => any;
   };
}

export function entity<T>(config: EntityConfig<T>) { }


