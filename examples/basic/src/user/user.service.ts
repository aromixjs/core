import { provide, tryRun, tryRunAsync, tryAll, pass, fail } from "@aromix/core";

@provide()
export class UserService {
  private users = [
    { id: "1", name: "Alice", email: "alice@example.com", suspended: false, credits: 100 },
    { id: "2", name: "Bob", email: "bob@example.com", suspended: true, credits: 50 },
    { id: "3", name: "Carol", email: "carol@example.com", suspended: false, credits: 200 },
  ];

  findById(id: string) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return fail("not_found" as const);
    if (user.suspended) return fail("suspended" as const);
    return pass(user);
  }

  findAll() {
    return pass(this.users);
  }

  updateEmail(id: string, email: string) {
    const parsed = tryRun(() => new URL(`mailto:${email}`));
    if (!parsed.ok) return fail("invalid_email" as const, parsed.cause);

    const user = this.users.find((u) => u.id === id);
    if (!user) return fail("not_found" as const);

    const taken = this.users.some((u) => u.email === email && u.id !== id);
    if (taken) return fail("email_taken" as const);

    user.email = email;
    return pass(user);
  }

  transferCredits(fromId: string, toId: string, amount: number) {
    if (amount <= 0) return fail("invalid_amount" as const);

    const sender = this.users.find((u) => u.id === fromId);
    if (!sender) return fail("sender_not_found" as const);
    if (sender.suspended) return fail("sender_suspended" as const);
    if (sender.credits < amount) return fail("insufficient_credits" as const);

    const receiver = this.users.find((u) => u.id === toId);
    if (!receiver) return fail("receiver_not_found" as const);
    if (receiver.suspended) return fail("receiver_suspended" as const);

    sender.credits -= amount;
    receiver.credits += amount;
    return pass({ sender, receiver, amount });
  }

  async findWithRole(id: string) {
    const [user, role] = await tryAll([
      () => Promise.resolve(this.users.find((u) => u.id === id)),
      () => Promise.resolve({ role: "admin", userId: id }),
    ]);

    if (!user.ok) return fail("unexpected_error" as const, user.cause);
    if (!role.ok) return fail("unexpected_error" as const, role.cause);

    if (!user.data) return fail("not_found" as const);

    return pass({ ...user.data, ...role.data });
  }
}
