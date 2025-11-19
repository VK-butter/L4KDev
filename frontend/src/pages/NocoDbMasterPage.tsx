import { useSearchParams } from 'react-router-dom';
import { EmbedSwitcher } from '../components/embeds/EmbedSwitcher';

export function NocoDbMasterPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('embed');

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <p className="text-xs uppercase tracking-widest text-emerald-500">
            NOCODB MASTER
          </p>
          <h1 className="text-2xl font-semibold text-emerald-900">
            Embedded Tables
          </h1>
          <p className="mt-2 text-sm text-emerald-600">
            View live tables from the Learning for Kidz workspace. Select any tab to load the latest data via the
            backend proxy (no additional login required).
          </p>
        </header>
        <EmbedSwitcher
          initialTargetId={selected}
          onSelect={(id) => {
            const next = new URLSearchParams(params);
            next.set('embed', id);
            setParams(next, { replace: true });
          }}
        />
      </section>
    </div>
  );
}
