//@ts-nocheck

import { action } from "./lib/action";
import { inject } from "./lib/di";

@group("user")
class Users {
  private userSerivce = inject(UserSerivce);

  @action("all")
  getAll(ctx: Packet<Query>) {
    return ctx.emit(data);
  }
}

const client = createClient("http://...");



const data=client.listen('user:all')



<p>{{data.userId}}</p>