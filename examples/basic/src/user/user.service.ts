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

    if (!user) return fail("not_found");
    if (user.suspended) return fail("suspended");
    return pass(user);
  }
}
