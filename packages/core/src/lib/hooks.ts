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
      event: "error";
      run: (error: unknown) => Promise<any> | any;
    };
