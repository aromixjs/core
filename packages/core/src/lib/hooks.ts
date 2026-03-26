import { RawRequest } from "./request";
import { ResponseBuilder } from "./response";

export type Hook =
  | {
      event: "start" | "stop";
      run: () => Promise<void> | void;
    }
  | {
      event: "request";
      run: () => Promise<ResponseBuilder | void> | ResponseBuilder | void;
    }
  | {
      event: "response";
      run: (builder: ResponseBuilder) => Promise<void> | void;
    }
  | {
      event: "error";
      run: (error: unknown) => Promise<ResponseBuilder> | ResponseBuilder;
    };
