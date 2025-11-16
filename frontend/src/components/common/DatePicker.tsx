import { useEffect, useMemo, useRef, useState } from 'react';

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fromISO(iso?: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function fmtDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startDay = first.getDay(); // 0=Sun
  const cells: Array<{ date: Date; inMonth: boolean }>[] = [];
  const current = new Date(year, monthIndex, 1 - startDay);
  for (let week = 0; week < 6; week++) {
    const row: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 7; i++) {
      row.push({ date: new Date(current), inMonth: current.getMonth() === monthIndex });
      current.setDate(current.getDate() + 1);
    }
    cells.push(row);
  }
  return cells;
}

export interface DatePickerProps {
  label?: string;
  valueISO?: string;
  onChangeISO: (iso: string) => void;
}

export function DatePicker({ label, valueISO, onChangeISO }: DatePickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => fromISO(valueISO ?? ''), [valueISO]);
  const [visible, setVisible] = useState<Date>(() => selected);

  useEffect(() => setVisible(selected), [selected]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!anchorRef.current) return;
      if (!anchorRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const grid = useMemo(() => getMonthGrid(visible.getFullYear(), visible.getMonth()), [visible]);

  function pick(d: Date) {
    onChangeISO(toISO(d));
    setOpen(false);
  }

  return (
    <div className="relative" ref={anchorRef}>
      {label && (
        <label className="block text-xs font-medium text-emerald-700 mb-1">{label}</label>
      )}
      <button
        type="button"
        className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-sm text-left focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        onClick={() => setOpen((v) => !v)}
      >
        {fmtDDMMYYYY(selected)}
      </button>
      {open && (
        <div className="absolute z-10 mt-2 w-72 rounded-xl border border-emerald-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-sm text-emerald-800">
            <button
              type="button"
              className="rounded border border-emerald-200 px-2 py-1 hover:border-emerald-400"
              onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="font-medium">
              {visible.toLocaleString('en-GB', { month: 'long' })} {visible.getFullYear()}
            </span>
            <button
              type="button"
              className="rounded border border-emerald-200 px-2 py-1 hover:border-emerald-400"
              onClick={() => setVisible(new Date(visible.getFullYear(), visible.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <table className="w-full text-xs text-emerald-800">
            <thead>
              <tr>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <th key={d} className="px-1 py-1 text-center text-emerald-600">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((week, idx) => (
                <tr key={idx}>
                  {week.map((cell, i) => {
                    const isSelected = toISO(cell.date) === toISO(selected);
                    const base = 'mx-auto h-8 w-8 rounded-full flex items-center justify-center';
                    const cls = isSelected
                      ? 'bg-emerald-600 text-white'
                      : cell.inMonth
                      ? 'hover:bg-emerald-50'
                      : 'text-emerald-400 hover:bg-emerald-50';
                    return (
                      <td key={i} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          className={`${base} ${cls}`}
                          onClick={() => pick(cell.date)}
                        >
                          {cell.date.getDate()}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
