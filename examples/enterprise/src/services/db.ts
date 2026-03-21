import { provide, inject } from "@aromix/core";
import { LoggerService } from "./logger";

@provide()
export class DatabaseService {
  private logger = inject(LoggerService);
  private storage = new Map<string, any>();

  async save(key: string, data: any) {
    this.logger.info(`Saving data to key: ${key}`);
    this.storage.set(key, data);
    return true;
  }

  async find(key: string) {
    this.logger.info(`Finding data for key: ${key}`);
    return this.storage.get(key);
  }
}
