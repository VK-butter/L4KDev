import { Router } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  requireRole
} from '../../middleware/session';
import {
  createUser,
  listUsers,
  setUserStatus,
  updateUser
} from '../../services/admin/userDirectoryService';
import { listAuditEntries } from '../../services/admin/auditLogService';

const router = Router();

router.use(requireAuth, requireRole('admin'));

const statusEnum = z.enum(['active', 'inactive']).optional();
const roleEnum = z.enum(['analyst', 'admin']);

const createSchema = z.object({
  username: z.string().email(),
  displayName: z.string().min(2),
  role: roleEnum,
  password: z.string().min(8)
});

const updateSchema = z.object({
  displayName: z.string().min(2).optional(),
  role: roleEnum.optional()
});

router.get('/users', async (req, res, next) => {
  try {
    const status = statusEnum.parse(req.query.status);
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;
    const users = await listUsers({ status, search });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const actorId = req.session!.user!.id;
    const user = await createUser(actorId, body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const params = z.string().parse(req.params.id);
    const body = updateSchema.parse(req.body);
    const actorId = req.session!.user!.id;
    const user = await updateUser(actorId, params, body);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/deactivate', async (req, res, next) => {
  try {
    const userId = z.string().parse(req.params.id);
    const actorId = req.session!.user!.id;
    const user = await setUserStatus(actorId, userId, 'inactive');
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/reactivate', async (req, res, next) => {
  try {
    const userId = z.string().parse(req.params.id);
    const actorId = req.session!.user!.id;
    const user = await setUserStatus(actorId, userId, 'active');
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/audit', async (_req, res, next) => {
  try {
    const entries = await listAuditEntries();
    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

export default router;
