import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { user } from '../db/schema.js';
import type { Role, UserRoles } from './ports.js';

export class DrizzleUserRoles implements UserRoles {
  constructor(private readonly db: Db) {}

  async getRole(userId: string): Promise<Role> {
    const [row] = await this.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId));
    return row?.role ?? 'learner';
  }
}
