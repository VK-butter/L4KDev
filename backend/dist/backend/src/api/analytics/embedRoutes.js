import { Router } from 'express';
import { listEmbeddingTargets, fetchNocoDbPlaceholderData } from '../../services/embeds/embedRegistry';
const router = Router();
router.get('/', (_req, res) => {
    res.json({ embeds: listEmbeddingTargets() });
});
router.get('/nocodb-placeholder', async (_req, res, next) => {
    try {
        const payload = await fetchNocoDbPlaceholderData();
        res.json(payload);
    }
    catch (error) {
        next(error);
    }
});
export default router;
