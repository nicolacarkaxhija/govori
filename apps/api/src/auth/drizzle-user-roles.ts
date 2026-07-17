import { desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { user } from '../db/schema.js';
import type { Role, UserDirectory, UserRoles, UserSummary } from './ports.js';

export class DrizzleUserRoles implements UserRoles, UserDirectory {
  constructor(private readonly db: Db) {}

  async getRole(userId: string): Promise<Role> {
    const [row] = await this.db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, userId));
    return row?.role ?? 'learner';
  }

  async listUsers(limit: number): Promise<UserSummary[]> {
    const rows = await this.db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(limit);
    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async setRole(userId: string, role: Role): Promise<boolean> {
    const updated = await this.db
      .update(user)
      .set({ role })
      .where(eq(user.id, userId))
      .returning({ id: user.id });
    return updated.length > 0;
  }
}
