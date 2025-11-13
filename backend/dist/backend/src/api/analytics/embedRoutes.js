import { Router } from 'express';
import { listEmbeddingTargets, fetchNocoDbPlaceholderData } from '../../services/embeds/embedRegistry';
const router = Router();
router.get('/', (_req, res) => {
    res.json({ embeds: listEmbeddingTargets() });
});
router.get('/nocodb-placeholder', async (_req, res) => {
    try {
        const payload = await fetchNocoDbPlaceholderData();
        res.json(payload);
    }
    catch (error) {
        console.error('[Embeds] Failed to load NocoDB placeholder', error);
        res.status(502).json({ error: 'EMBED_SOURCE_UNAVAILABLE' });
    }
});
export default router;
