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
    const filtered = picked.filter(
      (column) =>
        column.toLowerCase() !== 'createdat' && column.toLowerCase() !== 'updatedat'
    );
    // Move หมวดหมู่ right after ช่องทางการขาย if both exist
    const chanIdx = filtered.findIndex((c) => c === 'ช่องทางการขาย');
    const catIdx = filtered.findIndex((c) => c === 'หมวดหมู่');
    if (chanIdx >= 0 && catIdx >= 0 && catIdx !== chanIdx + 1) {
      const reordered = filtered.filter((c) => c !== 'หมวดหมู่');
      const newChanIdx = reordered.findIndex((c) => c === 'ช่องทางการขาย');
      reordered.splice(newChanIdx + 1, 0, 'หมวดหมู่');
      return reordered;
    }
    return filtered;
  }, [columns, rows]);

  return (
    <div className="panel h-full w-full">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 pb-4 dark:border-white/[0.07]">
        <div>
          <p className="section-heading">Table</p>
          <h3 className="text-base font-semibold text-gray-900 dark:text-emerald-50">
            {target.title}
          </h3>
          {target.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-emerald-500">{target.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {target.manageUrl && (
            <a
              href={target.manageUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-sm btn-outline"
            >
              Edit in NocoDB
            </a>
          )}
          <button
            type="button"
            onClick={fetchData}
            className="btn-sm btn-outline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </header>

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
        </div>
      )}
      {error && (
        <div className="flex h-48 flex-col items-center justify-center gap-3" role="alert">
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          <button type="button" onClick={fetchData} className="btn-sm btn-outline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && (
        <div className="overflow-auto rounded-xl border border-emerald-100 dark:border-white/[0.06]">
          <table className="tbl">
            <thead>
              <tr>
                {columnHeaders.map((column) => (
                  <th key={column} scope="col">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
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
                      <td key={`${target.id}-${index}-${column}`} className="whitespace-nowrap">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columnHeaders.length || 1} className="px-4 py-8 text-center text-gray-400 dark:text-emerald-600">
                    No rows returned from NocoDB.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
