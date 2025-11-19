import type { EmbeddingTarget } from '@shared/index';

interface IframeEmbedProps {
  target: EmbeddingTarget;
}

export function IframeEmbed({ target }: IframeEmbedProps) {
  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <header className="border-b border-emerald-50 px-6 py-4">
        <h3 className="text-lg font-semibold text-emerald-900">
          {target.title}
        </h3>
        <p className="text-sm text-emerald-600">{target.description}</p>
      </header>
      <div className="p-6">
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700">
          <p className="font-semibold">Integration notes</p>
          <p>{target.integrationNotes}</p>
          {target.status !== 'ready' && (
            <p className="mt-2 text-xs text-emerald-500">
              Replace the iframe source with the live integration URL once credentials are ready.
            </p>
          )}
        </div>
        <div className="mt-4 h-80 overflow-hidden rounded-xl border border-emerald-50 shadow-inner">
          <iframe
            title={target.title}
            src={target.placeholderUrl}
            className="h-full w-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>
      </div>
    </div>
  );
}
