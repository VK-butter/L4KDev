import { Router } from 'express';
import { listEmbeddingTargets, getEmbeddingTarget } from '../../services/embeds/embedRegistry';
import { fetchNocoDbRecords } from '../../services/nocodb/client';
const router = Router();
router.get('/', (_req, res) => {
    res.json({ embeds: listEmbeddingTargets() });
});
router.get('/nocodb/:targetId/records', async (req, res) => {
    const target = getEmbeddingTarget(req.params.targetId);
    if (!target || target.type !== 'api') {
        return res.status(404).json({ error: 'EMBED_NOT_FOUND' });
    }
    try {
        const limit = Number(req.query.limit);
        const offset = Number(req.query.offset);
        const payload = await fetchNocoDbRecords(target, {
            limit: Number.isFinite(limit) ? limit : undefined,
            offset: Number.isFinite(offset) ? offset : undefined
        });
        res.json(payload);
    }
    catch (error) {
        console.error('[Embeds] Failed to load NocoDB records', error);
        res.status(502).json({
            error: 'NOCODB_UNAVAILABLE',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/nocodb-placeholder', async (_req, res) => {
    try {
        const payload = { title: 'Placeholder', values: [] };
        res.json(payload);
    }
    catch (error) {
        console.error('[Embeds] Failed to load NocoDB placeholder', error);
        res.status(502).json({ error: 'EMBED_SOURCE_UNAVAILABLE' });
    }
});
export default router;
