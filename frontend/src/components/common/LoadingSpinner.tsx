interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400 dark:text-emerald-600" role="status" aria-label={message}>
      <svg className="h-5 w-5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
