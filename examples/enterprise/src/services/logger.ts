import { provide } from "@aromix/core";

@provide()
export class LoggerService {
  info(msg: string) {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`);
  }
}
