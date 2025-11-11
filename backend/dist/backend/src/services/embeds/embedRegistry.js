import { embeddingTargets } from '@shared-config/embeds';
export function listEmbeddingTargets() {
    return embeddingTargets;
}
export async function fetchNocoDbPlaceholderData() {
    // Mocked chart-friendly payload for local demo purposes.
    return {
        title: 'Mock NocoDB Orders',
        values: [
            { week: 'W1', orders: 120 },
            { week: 'W2', orders: 150 },
            { week: 'W3', orders: 170 },
            { week: 'W4', orders: 160 }
        ]
    };
}
