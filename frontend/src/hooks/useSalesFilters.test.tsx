import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useSalesFilters } from './useSalesFilters';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

describe('useSalesFilters', () => {
  it('returns defaults when no params are supplied', () => {
    const { result } = renderHook(() => useSalesFilters(), { wrapper });
    expect(result.current.filters.categories).toEqual([]);
    expect(result.current.filters.statuses).toEqual([]);
  });

  it('updates categories in query string', () => {
    const { result } = renderHook(() => useSalesFilters(), { wrapper });
    act(() => {
      result.current.setCategories(['Hardware']);
    });
    expect(result.current.filters.categories).toEqual(['Hardware']);
  });
});
