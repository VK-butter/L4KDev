import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULT_RANGE_DAYS = 30;

function formatISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (DEFAULT_RANGE_DAYS - 1));
  return {
    start: formatISO(start),
    end: formatISO(end)
  };
}

export interface SalesFilters {
  dateRange: [string, string];
  categories: string[];
  statuses: string[];
}

export function useSalesFilters() {
  const [params, setParams] = useSearchParams();
  const defaults = useMemo(getDefaultRange, []);

  const filters: SalesFilters = useMemo(() => {
    const dateStart = params.get('dateStart') ?? defaults.start;
    const dateEnd = params.get('dateEnd') ?? defaults.end;
    const categories = params.get('categories')
      ? params.get('categories')!.split(',').filter(Boolean)
      : [];
    const statuses = params.get('statuses')
      ? params.get('statuses')!.split(',').filter(Boolean)
      : [];

    return {
      dateRange: [dateStart, dateEnd],
      categories,
      statuses
    };
  }, [params, defaults]);

  const updateParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      updater(next);
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  useEffect(() => {
    if (!params.get('dateStart') || !params.get('dateEnd')) {
      updateParams((next) => {
        next.set('dateStart', defaults.start);
        next.set('dateEnd', defaults.end);
      });
    }
  }, [params, defaults, updateParams]);

  const setDateRange = useCallback(
    (start: string, end: string) => {
      updateParams((next) => {
        next.set('dateStart', start);
        next.set('dateEnd', end);
      });
    },
    [updateParams]
  );

  const setCategories = useCallback(
    (categories: string[]) => {
      updateParams((next) => {
        if (categories.length === 0) {
          next.delete('categories');
        } else {
          next.set('categories', categories.join(','));
        }
      });
    },
    [updateParams]
  );

  const setStatuses = useCallback(
    (statuses: string[]) => {
      updateParams((next) => {
        if (statuses.length === 0) {
          next.delete('statuses');
        } else {
          next.set('statuses', statuses.join(','));
        }
      });
    },
    [updateParams]
  );

  return {
    filters,
    setDateRange,
    setCategories,
    setStatuses
  };
}
