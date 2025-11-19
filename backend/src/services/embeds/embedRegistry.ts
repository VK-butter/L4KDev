import type { EmbeddingTarget } from '@shared/index';
import { embeddingTargets } from '@shared-config/embeds';

export function listEmbeddingTargets(): EmbeddingTarget[] {
  return embeddingTargets;
}

export function getEmbeddingTarget(id: string): EmbeddingTarget | undefined {
  return embeddingTargets.find((target) => target.id === id);
}
