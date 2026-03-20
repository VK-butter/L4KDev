interface LoadingRowsProps {
  rows?: number;
  cols?: number;
}

export function LoadingRows({ rows = 4, cols = 4 }: LoadingRowsProps) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading data…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
