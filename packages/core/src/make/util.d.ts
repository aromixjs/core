import { Hook } from "../hooks";
export declare function filter<T extends Hook["on"]>(hooks: Hook[], on: T): Extract<Hook, {
    on: T;
}>["run"][];
//# sourceMappingURL=util.d.ts.map