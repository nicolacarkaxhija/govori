import type { ReviewEvent } from '@glotty/srs';

export interface ExportBundle {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
  reviews: ReviewEvent[];
}

/** Self-serve GDPR rights (ADR 0023): portability and erasure. */
export interface AccountRights {
  exportData(userId: string): Promise<ExportBundle | undefined>;
  /**
   * Erases the user; sessions, accounts, and review events cascade.
   * When contributions exist they must be pseudonymized here, never
   * deleted (ADR 0010: content stays, attribution goes).
   */
  deleteAccount(userId: string): Promise<void>;
}
