import { randomUUID } from 'crypto';
import type { UserAccount, UserRole } from '@shared/index';
import { mockDataStore } from '../../data/mocks';
import { recordAuditEvent } from './auditLogService';

export interface ListUsersOptions {
  status?: 'active' | 'inactive';
  search?: string;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function toPlainPassword(password: string) {
  return `plain:${password}`;
}

function sanitize(user: UserAccount) {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

export async function listUsers(options: ListUsersOptions = {}) {
  const users = await mockDataStore.getUsers();
  const { status, search } = options;

  return users
    .filter((user) => {
      if (status && user.status !== status) {
        return false;
      }
      if (search) {
        const normalized = search.toLowerCase();
        return (
          user.username.toLowerCase().includes(normalized) ||
          user.displayName.toLowerCase().includes(normalized)
        );
      }
      return true;
    })
    .map(sanitize);
}

export async function createUser(actorId: string, input: CreateUserInput) {
  const users = await mockDataStore.getUsers();
  const normalized = normalizeUsername(input.username);

  if (users.some((user) => user.username.toLowerCase() === normalized)) {
    throw Object.assign(new Error('USERNAME_EXISTS'), { status: 409 });
  }

  const newUser: UserAccount = {
    id: randomUUID(),
    username: normalized,
    displayName: input.displayName,
    role: input.role,
    status: 'active',
    passwordHash: toPlainPassword(input.password),
    lastLoginAt: undefined
  };

  await mockDataStore.saveUsers([newUser, ...users]);
  await recordAuditEvent({
    actorId,
    action: 'create',
    targetUserId: newUser.id,
    details: `Created ${newUser.username}`
  });
  return sanitize(newUser);
}

export async function updateUser(
  actorId: string,
  userId: string,
  updates: UpdateUserInput
) {
  const users = await mockDataStore.getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
  }

  const existing = users[index];
  const updated: UserAccount = {
    ...existing,
    displayName: updates.displayName ?? existing.displayName,
    role: updates.role ?? existing.role
  };

  users[index] = updated;
  await mockDataStore.saveUsers(users);
  await recordAuditEvent({
    actorId,
    action: 'update',
    targetUserId: updated.id,
    details: 'Updated profile'
  });
  return sanitize(updated);
}

export async function setUserStatus(
  actorId: string,
  userId: string,
  status: 'active' | 'inactive'
) {
  const users = await mockDataStore.getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) {
    throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
  }

  const existing = users[index];
  const updated: UserAccount = {
    ...existing,
    status
  };

  users[index] = updated;
  await mockDataStore.saveUsers(users);
  await recordAuditEvent({
    actorId,
    action: status === 'active' ? 'reactivate' : 'deactivate',
    targetUserId: updated.id,
    details: `${status === 'active' ? 'Reactivated' : 'Deactivated'} user`
  });
  return sanitize(updated);
}
