export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}
