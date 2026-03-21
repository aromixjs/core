import { group, action, inject } from "@aromix/core";
import { DatabaseService } from "../services/db";

@group("user")
export class UserHandler {
  private db = inject(DatabaseService);

  @action("create")
  async createUser(ctx: { body: { id: string; name: string; email: string } }) {
    const { id, name, email } = ctx.body;
    await this.db.save(id, { name, email, createdAt: new Date() });
    return { status: 201, data: { status: "created", id } };
  }

  @action("get")
  async getUser(ctx: { body: { id: string } }) {
    const user = await this.db.find(ctx.body.id);
    if (!user) return { status: 404, data: { error: "not_found" } };
    return { status: 200, data: user };
  }
}
