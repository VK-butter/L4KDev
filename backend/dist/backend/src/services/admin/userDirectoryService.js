import { randomUUID } from 'crypto';
import { mockDataStore } from '../../data/mocks';
import { recordAuditEvent } from './auditLogService';
function normalizeUsername(username) {
    return username.trim().toLowerCase();
}
function toPlainPassword(password) {
    return `plain:${password}`;
}
function sanitize(user) {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
}
export async function listUsers(options = {}) {
    const users = await mockDataStore.getUsers();
    const { status, search } = options;
    return users
        .filter((user) => {
        if (status && user.status !== status) {
            return false;
        }
        if (search) {
            const normalized = search.toLowerCase();
            return (user.username.toLowerCase().includes(normalized) ||
                user.displayName.toLowerCase().includes(normalized));
        }
        return true;
    })
        .map(sanitize);
}
export async function createUser(actorId, input) {
    const users = await mockDataStore.getUsers();
    const normalized = normalizeUsername(input.username);
    if (users.some((user) => user.username.toLowerCase() === normalized)) {
        throw Object.assign(new Error('USERNAME_EXISTS'), { status: 409 });
    }
    const newUser = {
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
export async function updateUser(actorId, userId, updates) {
    const users = await mockDataStore.getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
    }
    const existing = users[index];
    const updated = {
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
export async function setUserStatus(actorId, userId, status) {
    const users = await mockDataStore.getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
    }
    const existing = users[index];
    const updated = {
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
export async function deleteUser(actorId, userId) {
    const users = await mockDataStore.getUsers();
    const index = users.findIndex((user) => user.id === userId);
    if (index === -1) {
        throw Object.assign(new Error('USER_NOT_FOUND'), { status: 404 });
    }
    const target = users[index];
    if (target.status !== 'inactive') {
        throw Object.assign(new Error('USER_NOT_INACTIVE'), { status: 400 });
    }
    const remaining = users.filter((user) => user.id !== userId);
    await mockDataStore.saveUsers(remaining);
    await recordAuditEvent({
        actorId,
        action: 'delete',
        targetUserId: target.id,
        details: `Deleted user ${target.username}`
    });
    return sanitize(target);
}
