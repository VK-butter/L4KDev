import type { UserAccount, UserRole } from '@shared/index';
import { mockDataStore } from '../../data/mocks';

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

const hashPrefixes = ['plain:', 'plaintext:'];

function verifyPassword(user: UserAccount, candidate: string): boolean {
  const stored = user.passwordHash ?? '';
  if (!stored) {
    return false;
  }

  const prefix = hashPrefixes.find((p) => stored.startsWith(p));
  if (prefix) {
    return stored.slice(prefix.length) === candidate;
  }
  return stored === candidate;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthenticatedUser | null> {
  const normalized = username.trim().toLowerCase();
  const users = await mockDataStore.getUsers();
  const match = users.find(
    (user) =>
      user.username.toLowerCase() === normalized &&
      user.status === 'active' &&
      verifyPassword(user, password)
  );
  if (!match) {
    return null;
  }
  return {
    id: match.id,
    username: match.username,
    displayName: match.displayName,
    role: match.role
  };
}

export const sessionSerializer = (user: AuthenticatedUser) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  displayName: user.displayName
});
