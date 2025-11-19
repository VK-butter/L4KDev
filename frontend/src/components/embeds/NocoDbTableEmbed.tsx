import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EmbeddingTarget } from '@shared/index';
import { embedApi } from '../../services/embedApi';

interface Props {
  target: EmbeddingTarget;
}

type RecordRow = Record<string, unknown>;

const DEFAULT_LIMIT = 50;

export function NocoDbTableEmbed({ target }: Props) {
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = target.defaultLimit ?? DEFAULT_LIMIT;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await embedApi.fetchNocoRecords(target.id, { limit });
      setColumns(response.data.columns);
      setRows(response.data.rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load data from NocoDB.'
      );
    } finally {
      setLoading(false);
    }
  }, [limit, target.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columnHeaders = useMemo(() => {
    const picked =
      columns.length > 0 ? columns : rows.length > 0 ? Object.keys(rows[0]) : [];
    return picked.filter(
      (column) =>
        column.toLowerCase() !== 'createdat' && column.toLowerCase() !== 'updatedat'
    );
  }, [columns, rows]);

  return (
    <div className="h-full w-full rounded-2xl border border-emerald-100 bg-white shadow-sm">
      <header className="border-b border-emerald-50 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-emerald-900">
              {target.title}
            </h3>
            <p className="text-sm text-emerald-600">{target.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {target.manageUrl && (
              <a
                href={target.manageUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-200 px-4 py-1 text-sm font-semibold text-emerald-600 hover:border-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                Edit in NocoDB
              </a>
            )}
            <button
              type="button"
              onClick={fetchData}
              className="rounded-full border border-emerald-200 px-4 py-1 text-sm font-semibold text-emerald-700 hover:border-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>
      </header>
      <div className="p-6">
        <div className="mt-0">
          {loading && (
            <div
              className="flex h-64 items-center justify-center text-emerald-400"
              role="status"
              aria-live="polite"
            >
              Loading…
            </div>
          )}
          {error && (
            <div
              className="flex h-64 flex-col items-center justify-center gap-3 text-red-500"
              role="alert"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="rounded-full border border-red-200 px-4 py-1 text-sm text-red-600 hover:border-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && (
            <div className="max-h-[32rem] overflow-auto rounded-xl border border-emerald-100">
              <table className="min-w-full divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50/60">
                  <tr>
                    {columnHeaders.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-emerald-600"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 bg-white">
                  {rows.map((row, index) => (
                    <tr key={`${target.id}-${index}`}>
                      {columnHeaders.map((column) => {
                        const value = row[column];
                        const display =
                          value === null || value === undefined
                            ? '—'
                            : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value);
                        return (
                          <td
                            key={`${target.id}-${index}-${column}`}
                            className="whitespace-nowrap px-4 py-2 text-emerald-900"
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnHeaders.length || 1}
                        className="px-4 py-6 text-center text-emerald-400"
                      >
                        No rows returned from NocoDB.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
