import { useEffect, useState } from 'react';
import type { EmbeddingTarget } from '@shared/index';
import { embedApi } from '../../services/embedApi';
import { SupersetEmbed } from './SupersetEmbed';
import { NocoDbPlaceholder } from './NocoDbPlaceholder';

export function EmbedSwitcher() {
  const [targets, setTargets] = useState<EmbeddingTarget[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadEmbeds() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await embedApi.list();
        if (!cancelled) {
          setTargets(data.embeds);
          setSelectedId(data.embeds[0]?.id ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load embeds.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadEmbeds();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 text-center text-emerald-400">
        Loading embed targets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600">
        {error}
      </div>
    );
  }

  if (!selectedId) {
    return null;
  }

  const selected = targets.find((target) => target.id === selectedId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Embedded dashboards">
        {targets.map((target) => (
          <button
            key={target.id}
            type="button"
            data-testid={`embed-tab-${target.id}`}
            onClick={() => setSelectedId(target.id)}
            role="tab"
            aria-selected={selectedId === target.id}
            aria-controls={`embed-panel-${target.id}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${
              selectedId === target.id
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-emerald-100 text-emerald-500 hover:text-emerald-700'
            }`}
          >
            {target.title}
          </button>
        ))}
      </div>

      <div
        data-testid="embed-panel"
        role="tabpanel"
        id={`embed-panel-${selectedId}`}
        aria-live="polite"
      >
        {selected?.type === 'iframe' && <SupersetEmbed target={selected} />}
        {selected?.type === 'api' && <NocoDbPlaceholder target={selected} />}
      </div>
    </div>
  );
}
