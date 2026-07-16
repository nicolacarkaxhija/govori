export type Role = 'learner' | 'admin';

/** Read port for user roles; roles live in our schema, not in auth internals. */
export interface UserRoles {
  getRole(userId: string): Promise<Role>;
}
