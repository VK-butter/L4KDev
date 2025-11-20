const DEFAULT_LIMIT = 50;
const baseUrl = (process.env.NOCODB_BASE_URL ?? '').replace(/\/$/, '');
const apiToken = process.env.NOCODB_API_TOKEN;
function ensureConfig(target) {
    if (!baseUrl) {
        throw new Error('NOCODB_BASE_URL missing in environment');
    }
    if (!apiToken) {
        throw new Error('NOCODB_API_TOKEN missing in environment');
    }
    if (!target.projectSlug || !target.tableSlug) {
        throw new Error(`Embedding target ${target.id} missing projectSlug/tableSlug`);
    }
}
async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            'xc-token': apiToken ?? '',
            accept: 'application/json'
        }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`NocoDB request failed (${response.status}): ${text}`);
    }
    return response.json();
}
function normalizePayload(payload) {
    const rows = Array.isArray(payload?.list) && payload.list.length > 0
        ? payload.list
        : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.records)
                ? payload.records
                : [];
    const columns = Array.isArray(payload?.columns)
        ? payload.columns
        : rows.length > 0
            ? Object.keys(rows[0])
            : [];
    const meta = payload?.pageInfo ?? payload?.meta ?? payload?.pagination ?? undefined;
    return { columns, rows, meta, raw: payload };
}
export async function fetchNocoDbRecords(target, { limit, offset } = {}) {
    ensureConfig(target);
    const effectiveLimit = limit ?? target.defaultLimit ?? DEFAULT_LIMIT;
    const effectiveOffset = offset ?? 0;
    const errors = [];
    if (target.viewId) {
        try {
            const url = new URL(`${baseUrl}/api/v2/views/${target.viewId}/records`);
            url.searchParams.set('limit', String(effectiveLimit));
            url.searchParams.set('offset', String(effectiveOffset));
            const payload = await fetchJson(url);
            return normalizePayload(payload);
        }
        catch (error) {
            errors.push(error);
        }
    }
    try {
        const url = new URL(`${baseUrl}/api/v1/db/data/noco/${target.projectSlug}/${target.tableSlug}`);
        url.searchParams.set('limit', String(effectiveLimit));
        url.searchParams.set('offset', String(effectiveOffset));
        const payload = await fetchJson(url);
        return normalizePayload(payload);
    }
    catch (error) {
        errors.push(error);
    }
    const message = errors.map((err) => err.message).join('; ') || `Failed to load data for ${target.title}`;
    throw new Error(message);
}
