export type Role = 'learner' | 'admin';

/** Read port for user roles; roles live in our schema, not in auth internals. */
export interface UserRoles {
  getRole(userId: string): Promise<Role>;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/** Admin-side directory for promoting community reviewers (ADR 0038). */
export interface UserDirectory {
  /** Newest first — the people who just joined are the ones you act on. */
  listUsers(limit: number): Promise<UserSummary[]>;
  /** Returns false when the user does not exist. */
  setRole(userId: string, role: Role): Promise<boolean>;
}
