import { provide, result } from "@aromix/core";

@provide()
export class UserService {
  findById(id: number) {
    if (id > 20) {
      return result.pass(id);
    }
    return result.fail("not_found");
  }
}
