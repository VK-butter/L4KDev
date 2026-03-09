interface NoDataStateProps {
  message?: string;
}

export function NoDataState({
  message = 'No data available for the selected filters.'
}: NoDataStateProps) {
  return (
    <div
      className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 text-center dark:border-emerald-800/50 dark:bg-emerald-900/10"
      role="status"
      aria-live="polite"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300 dark:text-emerald-700" aria-hidden>
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <p className="text-sm text-emerald-600 dark:text-emerald-500">{message}</p>
    </div>
  );
}
