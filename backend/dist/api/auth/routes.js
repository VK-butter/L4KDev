import { Router } from 'express';
import { z } from 'zod';
import { attachSessionUser, destroySession, requireAuth } from '../../middleware/session';
import { authenticateUser, sessionSerializer } from '../../services/auth/mockAuthService';
const router = Router();
const loginSchema = z.object({
    username: z.string().min(3),
    password: z.string().min(6)
});
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = loginSchema.parse(req.body);
        const authResult = await authenticateUser(username, password);
        if (!authResult) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }
        attachSessionUser(req, sessionSerializer(authResult));
        return res.json({
            user: authResult
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/logout', requireAuth, async (req, res, next) => {
    try {
        await destroySession(req);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
router.get('/session', async (req, res) => {
    if (req.session?.user) {
        return res.json({ authenticated: true, user: req.session.user });
    }
    return res.json({ authenticated: false, user: null });
});
export default router;
