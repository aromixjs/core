import { group, action, provide, inject } from "@aromix/core";

/**
 * A simple service illustrating dependency injection in Aromix.
 * Services should be annotated with @provide() if they need to be singleton instances.
 */
@provide()
export class AuthService {
  async validate(token: string) {
    // In a real app, you'd check a database or JWT
    return token === "aromix-secret";
  }
}

/**
 * A module grouping related actions under the 'user' namespace.
 * This will be accessible via actions like 'user:profile' or 'user:settings'.
 */
@group("user")
export class UserModule {
  private auth = inject(AuthService);

  /**
   * Represents a GET profile action.
   * Actions are standard methods decorated with @action().
   */
  @action("profile")
  async getProfile() {
    return {
      status: 200,
      data: {
        id: "usr_12345",
        username: "aromix_dev",
        role: "admin",
        metadata: {
          lastLogin: new Date().toISOString(),
        }
      }
    };
  }

  /**
   * Represents an update action that takes a request body.
   */
  @action("update")
  async updateProfile(ctx: { body: { username: string; email: string } }) {
    const { username, email } = ctx.body;
    
    // Logic to update user in DB would go here
    
    return {
      status: 200,
      data: {
        message: "Profile updated successfully",
        updatedFields: { username, email }
      }
    };
  }
}
