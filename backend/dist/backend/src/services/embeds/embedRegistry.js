import { embeddingTargets } from '@shared-config/embeds';
export function listEmbeddingTargets() {
    return embeddingTargets;
}
export function getEmbeddingTarget(id) {
    return embeddingTargets.find((target) => target.id === id);
}
