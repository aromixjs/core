import { group, action, request, response, inject } from "@aromix/core";
import { UserService } from "./user.service";

@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  get() {
    const { body } = request();

    const user = this.userService.findById(body.id);
    if (!user.ok) {
      if (user.err === "not_found")  return response.notFound("User not found");
      if (user.err === "suspended")  return response.forbidden("Account suspended");
    }

    return response.ok(user.data);
  }

  @action("getAll")
  getAll() {
    const users = this.userService.findAll();
    return response.ok(users.data);
  }

  @action("getWithRole")
  async getWithRole() {
    const { body } = request();

    const user = await this.userService.findWithRole(body.id);
    if (!user.ok) {
      if (user.err === "not_found")        return response.notFound("User not found");
      if (user.err === "unexpected_error") return response.internalError("Something went wrong");
    }

    return response.ok(user.data);
  }

  @action("updateEmail")
  updateEmail() {
    const { body } = request();

    const user = this.userService.updateEmail(body.id, body.email);
    if (!user.ok) {
      if (user.err === "not_found")     return response.notFound("User not found");
      if (user.err === "invalid_email") return response.badRequest("Invalid email format");
      if (user.err === "email_taken")   return response.conflict("Email already in use");
    }

    return response.ok(user.data);
  }

  @action("transfer")
  transfer() {
    const { body } = request();

    const transfer = this.userService.transferCredits(body.fromId, body.toId, body.amount);
    if (!transfer.ok) {
      if (transfer.err === "invalid_amount")       return response.badRequest("Amount must be greater than 0");
      if (transfer.err === "sender_not_found")     return response.notFound("Sender not found");
      if (transfer.err === "sender_suspended")     return response.forbidden("Sender account suspended");
      if (transfer.err === "insufficient_credits") return response.badRequest("Not enough credits");
      if (transfer.err === "receiver_not_found")   return response.notFound("Receiver not found");
      if (transfer.err === "receiver_suspended")   return response.forbidden("Receiver account suspended");
    }

    return response.ok({
      message: `Transferred ${body.amount} credits`,
      sender:   transfer.data.sender,
      receiver: transfer.data.receiver,
    });
  }
}