interface NoDataStateProps {
  message?: string;
}

export function NoDataState({
  message = 'No data available for the selected filters.'
}: NoDataStateProps) {
  return (
    <div
      className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/40 text-center text-sm text-emerald-600"
      role="status"
      aria-live="polite"
    >
      <p>{message}</p>
    </div>
  );
}
