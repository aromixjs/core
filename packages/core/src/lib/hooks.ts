import { Output } from "./send";

export type Hook =
  | {
      event: "app:start";
      run: () => Promise<void> | void;
    }
  | {
      event: "app:stop";
      run: () => Promise<void> | void;
    }
  | {
      event: "before:handler";
      run: () => Promise<Output | void> | Output | void;
    }
  | {
      event: "after:handler";
      run: (result: Output) => Promise<Output> | Output;
    }
  | {
      event: "error";
      run: (error: unknown) => Promise<Output> | Output;
    };
