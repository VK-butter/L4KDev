interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const start = ((page - 1) * pageSize + 1).toLocaleString();
  const end = Math.min(page * pageSize, totalRecords).toLocaleString();
  const total = totalRecords.toLocaleString();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-emerald-400">
      <span>
        {totalRecords > 0 ? `Showing ${start}–${end} of ${total}` : '\u00a0'}
      </span>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <label className="text-gray-500 dark:text-emerald-400">Per page</label>
            <select
              value={pageSize}
              onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
              className="input w-auto py-1.5 px-2"
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn btn-outline btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="px-2 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn btn-outline btn-sm disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
