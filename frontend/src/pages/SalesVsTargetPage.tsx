import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  analyticsSalesTargetApi,
  type SalesTargetBreakdownItem,
  type SalesTargetCompareResponse,
  type SalesTargetFilter,
  type SalesTargetOptionsResponse,
  type TargetPivotResponse
} from '../services/analyticsApi';

type DatePreset = 'daily' | 'monthly' | 'yearly';
type FilterState = Required<SalesTargetFilter> & { preset?: DatePreset };

const STATUS_OPTIONS = ['Complete', 'Cancel'];

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDefaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 365);
  return { dateStart: toIso(start), dateEnd: toIso(end) };
}

function getPresetRange(currentEnd: string, preset: DatePreset) {
  const end = parseDate(currentEnd);
  const start = new Date(end);
  if (preset === 'daily') start.setDate(end.getDate() - 1);
  else if (preset === 'monthly') start.setDate(1);
  else start.setMonth(0, 1);
  return { dateStart: toIso(start), dateEnd: toIso(end) };
}

function toggleValue(items: string[], value: string) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function fmtRev(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPct(value: number | null) {
  if (value == null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

/* ── Animated number counter ────────────────────── */
function AnimatedNum({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 600;
    const start = performance.now();
    const from = display;
    function tick(now: number) {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * ease));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toLocaleString()}{suffix}</>;
}

/* ── SVG Icons ──────────────────────────────────── */
const ActualIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const TargetIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
const GapIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>;
const PctIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;

/* ── KPI metric mini-card (same as ยอดขายรายช่องทาง) ── */
function MetricBox({ label, value, displayValue, icon, color }: {
  label: string; value?: number; displayValue?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:scale-[1.02]
      border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {displayValue != null ? displayValue : (value != null ? <AnimatedNum value={value} prefix="฿" /> : '—')}
        </p>
      </div>
    </div>
  );
}

/* ── Chip toggle for filter lists ───────────────── */
function ChipToggle({ items, selected, onToggle, label }: {
  items: string[]; selected: string[]; onToggle: (v: string) => void; label: string;
}) {
  if (items.length === 0) return <p className="text-xs text-gray-400 dark:text-emerald-600">No {label} available</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button key={item} type="button" onClick={() => onToggle(item)}
            className={`chip ${active ? 'chip-active' : ''}`}>
            {active && <svg className="inline -ml-0.5 mr-0.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            {item}
          </button>
        );
      })}
    </div>
  );
}

/* ── Breakdown mini-table (max 5 rows, scrollable) ── */
function BreakdownTable({ title, rows }: { title: string; rows: SalesTargetBreakdownItem[] }) {
  const display = rows.slice(0, 5);
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-3 text-center text-xs text-gray-400 dark:text-emerald-600">No data</p>
      ) : (
        <div className="overflow-auto rounded-lg border border-emerald-100 dark:border-white/[0.06]" style={{ maxHeight: '220px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Actual</th>
                <th>Target</th>
                <th>Gap</th>
                <th>Achv%</th>
              </tr>
            </thead>
            <tbody>
              {display.map((row) => {
                const tone = row.gapRevenue >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400';
                return (
                  <tr key={row.key}>
                    <td>{row.key}</td>
                    <td className="tabular-nums text-right">{fmtRev(row.actualRevenue)}</td>
                    <td className="tabular-nums text-right">{fmtRev(row.targetRevenue)}</td>
                    <td className={`tabular-nums text-right font-semibold ${tone}`}>{fmtRev(row.gapRevenue)}</td>
                    <td className="tabular-nums text-right">{formatPct(row.achievementPct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Delta badge ────────────────────────────────── */
function GapBadge({ value, pct }: { value: number; pct: number | null }) {
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold
      ${pos ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'}`}>
      {pos ? '▲' : '▼'} {fmtRev(Math.abs(value))} {pct != null && <span className="opacity-70">({formatPct(pct)})</span>}
    </span>
  );
}

/* ── Collapsible Section Wrapper ──────────────── */
function CollapsibleSection({ title, desc, defaultOpen, open: extOpen, onToggle, children, actions }: {
  title: string; desc?: string; defaultOpen?: boolean; open?: boolean; onToggle?: () => void;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  const [intOpen, setIntOpen] = useState(defaultOpen ?? true);
  const isOpen = extOpen !== undefined ? extOpen : intOpen;
  const toggle = extOpen !== undefined ? onToggle! : () => setIntOpen((v) => !v);
  return (
    <section className="panel">
      <div className="flex items-start gap-2">
        <button type="button" onClick={toggle} className="flex flex-1 items-center gap-2 text-left min-w-0">
          <svg className={`h-4 w-4 shrink-0 text-gray-400 dark:text-emerald-600 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
            {desc && <p className="text-xs text-gray-400 dark:text-emerald-500 mt-0.5">{desc}</p>}
          </div>
        </button>
        {isOpen && actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {isOpen && <div className="mt-3">{children}</div>}
    </section>
  );
}

/* ── Channel color palettes (same as ยอดขายรายช่องทาง VS) ── */
const CHANNEL_COLORS_DARK = [
  { bg: 'bg-emerald-600 dark:bg-emerald-700', text: 'text-white' },
  { bg: 'bg-blue-600 dark:bg-blue-700', text: 'text-white' },
  { bg: 'bg-violet-600 dark:bg-violet-700', text: 'text-white' },
  { bg: 'bg-amber-500 dark:bg-amber-600', text: 'text-white' },
  { bg: 'bg-rose-600 dark:bg-rose-700', text: 'text-white' },
  { bg: 'bg-cyan-600 dark:bg-cyan-700', text: 'text-white' },
  { bg: 'bg-pink-600 dark:bg-pink-700', text: 'text-white' },
  { bg: 'bg-teal-600 dark:bg-teal-700', text: 'text-white' },
];
const CHANNEL_COLORS_LIGHT = [
  { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-violet-50 dark:bg-violet-950', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-950', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-50 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-300' },
];
const CHANNEL_BORDER_COLORS = [
  'border-emerald-400 dark:border-emerald-600',
  'border-blue-400 dark:border-blue-600',
  'border-violet-400 dark:border-violet-600',
  'border-amber-400 dark:border-amber-600',
  'border-rose-400 dark:border-rose-600',
  'border-cyan-400 dark:border-cyan-600',
  'border-pink-400 dark:border-pink-600',
  'border-teal-400 dark:border-teal-600',
];
const CHANNEL_CELL_BG = [
  'bg-emerald-50/40 dark:bg-emerald-900/10',
  'bg-blue-50/40 dark:bg-blue-900/10',
  'bg-violet-50/40 dark:bg-violet-900/10',
  'bg-amber-50/40 dark:bg-amber-900/10',
  'bg-rose-50/40 dark:bg-rose-900/10',
  'bg-cyan-50/40 dark:bg-cyan-900/10',
  'bg-pink-50/40 dark:bg-pink-900/10',
  'bg-teal-50/40 dark:bg-teal-900/10',
];

/* ── Target Pivot Table Component ─────────────── */
function TargetPivotTable({ data }: { data: TargetPivotResponse }) {
  if (data.columnHeaders.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400 dark:text-emerald-600">No pivot data available</p>;
  }

  // Group columns by channel
  const channelGroups: Array<{ channel: string; categories: Array<{ category: string; colIdx: number }> }> = [];
  data.columnHeaders.forEach((h, idx) => {
    let group = channelGroups.find((g) => g.channel === h.channel);
    if (!group) {
      group = { channel: h.channel, categories: [] };
      channelGroups.push(group);
    }
    group.categories.push({ category: h.category, colIdx: idx });
  });

  // colMeta for cell rendering
  const colMeta: Array<{ gi: number; isFirst: boolean }> = [];
  channelGroups.forEach((g, gi) => {
    g.categories.forEach((_, catIdx) => {
      colMeta.push({ gi, isFirst: catIdx === 0 });
    });
  });

  // Column totals
  const colTotals = data.columnHeaders.map((_, ci) => ({
    target: data.months.reduce((s, m) => s + (m.cells[ci]?.target ?? 0), 0),
    actualCurrent: data.months.reduce((s, m) => s + (m.cells[ci]?.actualCurrent ?? 0), 0),
    actualPrevious: data.months.reduce((s, m) => s + (m.cells[ci]?.actualPrevious ?? 0), 0),
  }));

  const prevYear = data.year - 1;

  // Compute per-category left border class for data cells
  // Each category group of 3 sub-cols gets a left border on the first sub-col
  const catBorderMap: Array<{ gi: number; isFirstCat: boolean }> = [];
  channelGroups.forEach((g, gi) => {
    g.categories.forEach((_, catIdx) => {
      catBorderMap.push({ gi, isFirstCat: catIdx === 0 });
    });
  });

  return (
    <div className="overflow-auto rounded-lg border border-emerald-100 dark:border-white/[0.06]" style={{ maxHeight: '480px' }}>
      <table className="min-w-full border-collapse text-xs">
        <thead>
          {/* Row 1: Channel groups — dark color, each th individually sticky */}
          <tr>
            <th rowSpan={3} className="sticky left-0 px-3 py-2 bg-gray-50 dark:bg-[#0c1f16] min-w-[90px] text-center align-middle"
              style={{ position: 'sticky', top: 0, zIndex: 40 }}>
              เดือน
            </th>
            {channelGroups.map((g, gi) => {
              const color = CHANNEL_COLORS_DARK[gi % CHANNEL_COLORS_DARK.length];
              const border = CHANNEL_BORDER_COLORS[gi % CHANNEL_BORDER_COLORS.length];
              return (
                <th key={g.channel} colSpan={g.categories.length * 3}
                  className={`px-3 py-2.5 text-center font-bold text-sm tracking-wide border-l-2 ${border} ${color.bg} ${color.text}`}
                  style={{ position: 'sticky', top: 0, zIndex: 30 }}>
                  {g.channel}
                </th>
              );
            })}
            <th rowSpan={3} className="px-3 py-2 text-center align-middle border-l-2 border-gray-300 dark:border-white/20 min-w-[80px] bg-gray-100 dark:bg-gray-900 font-bold"
              style={{ position: 'sticky', top: 0, zIndex: 40 }}>
              รวม
            </th>
          </tr>
          {/* Row 2: Category sub-headers — light solid bg, sticky below row 1 */}
          <tr>
            {channelGroups.flatMap((g, gi) => {
              const color = CHANNEL_COLORS_LIGHT[gi % CHANNEL_COLORS_LIGHT.length];
              const border = CHANNEL_BORDER_COLORS[gi % CHANNEL_BORDER_COLORS.length];
              return g.categories.map((c, catIdx) => (
                <th key={`${g.channel}-${c.category}`} colSpan={3}
                  className={`px-3 py-1.5 text-center min-w-[200px] whitespace-nowrap text-[10px] font-semibold
                    ${catIdx === 0 ? `border-l-2 ${border}` : 'border-l-2 border-gray-300 dark:border-white/20'}
                    ${color.bg} ${color.text}`}
                  style={{ position: 'sticky', top: 37, zIndex: 20 }}>
                  {c.category}
                </th>
              ));
            })}
          </tr>
          {/* Row 3: Sub-columns — solid opaque bg, sticky below rows 1+2 */}
          <tr>
            {channelGroups.flatMap((g, gi) => {
              const border = CHANNEL_BORDER_COLORS[gi % CHANNEL_BORDER_COLORS.length];
              return g.categories.flatMap((c, catIdx) => {
                const leftBorder = catIdx === 0 ? `border-l-2 ${border}` : 'border-l-2 border-gray-300 dark:border-white/20';
                const stickyStyle = { position: 'sticky' as const, top: 62, zIndex: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.06)' };
                return [
                  <th key={`${g.channel}-${c.category}-t`}
                    className={`px-2 py-1 text-center text-[9px] font-medium uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200 border-b border-gray-300 dark:border-white/15 whitespace-nowrap ${leftBorder}`}
                    style={stickyStyle}>
                    เป้า {data.year + 543}
                  </th>,
                  <th key={`${g.channel}-${c.category}-ac`}
                    className="px-2 py-1 text-center text-[9px] font-medium uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200 border-b border-gray-300 dark:border-white/15 border-l border-gray-300 dark:border-white/15 whitespace-nowrap"
                    style={stickyStyle}>
                    ยอดขาย {data.year + 543}
                  </th>,
                  <th key={`${g.channel}-${c.category}-ap`}
                    className="px-2 py-1 text-center text-[9px] font-medium uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200 border-b border-gray-300 dark:border-white/15 border-l border-gray-300 dark:border-white/15 whitespace-nowrap"
                    style={stickyStyle}>
                    ยอดขาย {prevYear + 543}
                  </th>
                ];
              });
            })}
          </tr>
        </thead>
        <tbody>
          {data.months.map((m) => {
            const rowTarget = m.cells.reduce((s, c) => s + c.target, 0);
            const rowActualCur = m.cells.reduce((s, c) => s + c.actualCurrent, 0);
            const rowActualPrev = m.cells.reduce((s, c) => s + c.actualPrevious, 0);
            const rowTotal = rowTarget + rowActualCur + rowActualPrev;
            if (rowTotal === 0) return null;
            return (
              <tr key={m.monthIndex} className="border-b border-emerald-100/60 dark:border-white/[0.06] hover:bg-emerald-50/40 dark:hover:bg-white/[0.03]">
                <td className="sticky left-0 z-10 px-3 py-2 bg-white dark:bg-[#0f2119] font-semibold text-center">{m.label}</td>
                {m.cells.map((c, ci) => {
                  const meta = colMeta[ci];
                  const chBorder = CHANNEL_BORDER_COLORS[meta.gi % CHANNEL_BORDER_COLORS.length];
                  const cellBg = CHANNEL_CELL_BG[meta.gi % CHANNEL_CELL_BG.length];
                  const catLeftBorder = catBorderMap[ci].isFirstCat
                    ? `border-l-2 ${chBorder}`
                    : 'border-l-2 border-gray-200 dark:border-white/15';
                  return [
                    <td key={`${ci}-t`} className={`px-2 py-2 tabular-nums text-right ${cellBg} ${catLeftBorder}`}>
                      {fmtRev(c.target)}
                    </td>,
                    <td key={`${ci}-ac`} className={`px-2 py-2 tabular-nums text-right ${cellBg} border-l border-gray-200 dark:border-white/10`}>
                      {fmtRev(c.actualCurrent)}
                    </td>,
                    <td key={`${ci}-ap`} className={`px-2 py-2 tabular-nums text-right ${cellBg} border-l border-gray-200 dark:border-white/10`}>
                      {fmtRev(c.actualPrevious)}
                    </td>
                  ];
                })}
                <td className="px-3 py-2 tabular-nums text-right font-semibold border-l-2 border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.02]">
                  {fmtRev(rowActualCur)}
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          <tr className="border-t-2 border-emerald-300 dark:border-emerald-700 font-bold">
            <td className="sticky left-0 z-10 px-3 py-2 bg-emerald-50 dark:bg-[#0c1f16] text-center">รวมทั้งหมด</td>
            {colTotals.map((t, ci) => {
              const meta = colMeta[ci];
              const chBorder = CHANNEL_BORDER_COLORS[meta.gi % CHANNEL_BORDER_COLORS.length];
              const cellBg = CHANNEL_CELL_BG[meta.gi % CHANNEL_CELL_BG.length];
              const catLeftBorder = catBorderMap[ci].isFirstCat
                ? `border-l-2 ${chBorder}`
                : 'border-l-2 border-gray-200 dark:border-white/15';
              return [
                <td key={`${ci}-t`} className={`px-2 py-2 tabular-nums text-right ${cellBg} ${catLeftBorder}`}>
                  {fmtRev(t.target)}
                </td>,
                <td key={`${ci}-ac`} className={`px-2 py-2 tabular-nums text-right ${cellBg} border-l border-gray-200 dark:border-white/10`}>
                  {fmtRev(t.actualCurrent)}
                </td>,
                <td key={`${ci}-ap`} className={`px-2 py-2 tabular-nums text-right ${cellBg} border-l border-gray-200 dark:border-white/10`}>
                  {fmtRev(t.actualPrevious)}
                </td>
              ];
            })}
            <td className="px-3 py-2 tabular-nums text-right border-l-2 border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.02]">
              {fmtRev(colTotals.reduce((s, t) => s + t.actualCurrent, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ── Excel Export for Target Pivot ─────────────── */
function buildTargetPivotSheet(data: TargetPivotResponse) {
  const channelGroups: Array<{ channel: string; categories: Array<{ category: string; colIdx: number }> }> = [];
  data.columnHeaders.forEach((h, idx) => {
    let g = channelGroups.find((x) => x.channel === h.channel);
    if (!g) { g = { channel: h.channel, categories: [] }; channelGroups.push(g); }
    g.categories.push({ category: h.category, colIdx: idx });
  });

  const prevYear = data.year - 1;
  const rows: Array<Array<string | number>> = [];

  // Row 1: Channel headers
  const r1: Array<string | number> = [''];
  for (const g of channelGroups) {
    r1.push(g.channel);
    for (let i = 1; i < g.categories.length * 3; i++) r1.push('');
  }
  r1.push('รวม');
  rows.push(r1);

  // Row 2: Category headers
  const r2: Array<string | number> = [''];
  for (const g of channelGroups) {
    for (const c of g.categories) {
      r2.push(c.category);
      r2.push('');
      r2.push('');
    }
  }
  r2.push('');
  rows.push(r2);

  // Row 3: Sub-column headers
  const r3: Array<string | number> = ['เดือน'];
  for (const g of channelGroups) {
    for (let catIdx = 0; catIdx < g.categories.length; catIdx += 1) {
      r3.push(`เป้า ${data.year + 543}`);
      r3.push(`ยอดขาย ${data.year + 543}`);
      r3.push(`ยอดขาย ${prevYear + 543}`);
    }
  }
  r3.push('รวมยอดขายปีนี้');
  rows.push(r3);

  // Data rows
  for (const m of data.months) {
    const row: Array<string | number> = [m.label];
    let rowActualCur = 0;
    for (const c of m.cells) {
      row.push(c.target);
      row.push(c.actualCurrent);
      row.push(c.actualPrevious);
      rowActualCur += c.actualCurrent;
    }
    row.push(rowActualCur);
    rows.push(row);
  }

  // Totals row
  const totalsRow: Array<string | number> = ['รวมทั้งหมด'];
  let grandTotal = 0;
  for (let ci = 0; ci < data.columnHeaders.length; ci++) {
    const t = data.months.reduce((s, m) => s + (m.cells[ci]?.target ?? 0), 0);
    const ac = data.months.reduce((s, m) => s + (m.cells[ci]?.actualCurrent ?? 0), 0);
    const ap = data.months.reduce((s, m) => s + (m.cells[ci]?.actualPrevious ?? 0), 0);
    totalsRow.push(t);
    totalsRow.push(ac);
    totalsRow.push(ap);
    grandTotal += ac;
  }
  totalsRow.push(grandTotal);
  rows.push(totalsRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merge channel header cells
  const merges: XLSX.Range[] = [];
  let col = 1;
  for (const g of channelGroups) {
    const span = g.categories.length * 3;
    if (span > 1) merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + span - 1 } });
    // Merge category cells (each spans 3 cols)
    let catCol = col;
    for (let catIdx = 0; catIdx < g.categories.length; catIdx += 1) {
      merges.push({ s: { r: 1, c: catCol }, e: { r: 1, c: catCol + 2 } });
      catCol += 3;
    }
    col += span;
  }
  ws['!merges'] = merges;

  // Auto column widths
  const maxCols = rows[0].length;
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => ({
    wch: i === 0 ? 14 : 15
  }));

  return ws;
}

export function SalesVsTargetPage() {
  const defaults = useMemo(getDefaultRange, []);
  const [filter, setFilter] = useState<FilterState>({
    ...defaults,
    statuses: [],
    channels: [],
    categories: []
  });
  const [options, setOptions] = useState<SalesTargetOptionsResponse>({
    channels: [],
    categories: []
  });
  const [compareData, setCompareData] = useState<SalesTargetCompareResponse | null>(null);
  const [pivotData, setPivotData] = useState<TargetPivotResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loadingPivot, setLoadingPivot] = useState(false);
  const [pivotYear, setPivotYear] = useState(() => new Date().getFullYear());
  const [pivotOpen, setPivotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClearFilter = () => {
    setFilter({ ...getDefaultRange(), statuses: [], channels: [], categories: [], preset: undefined });
  };

  const optionsKey = `${filter.dateStart}|${filter.dateEnd}|${filter.statuses.join(',')}`;
  const compareKey = JSON.stringify(filter);

  useEffect(() => {
    let ignore = false;
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const result = await analyticsSalesTargetApi.getSalesTargetOptions({
          dateStart: filter.dateStart,
          dateEnd: filter.dateEnd,
          statuses: filter.statuses
        });
        if (ignore) return;
        const nextOptions = result.data.data;
        setOptions(nextOptions);
        setFilter((prev) => ({
          ...prev,
          channels: prev.channels.filter((channel) => nextOptions.channels.includes(channel)),
          categories: prev.categories.filter((category) => nextOptions.categories.includes(category))
        }));
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load options');
      } finally {
        if (!ignore) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      ignore = true;
    };
  }, [optionsKey, filter.dateStart, filter.dateEnd, filter.statuses]);

  useEffect(() => {
    let ignore = false;
    async function loadCompare() {
      setLoadingCompare(true);
      setError(null);
      try {
        const result = await analyticsSalesTargetApi.compareSalesTarget(filter);
        if (!ignore) setCompareData(result.data.data);
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to compare target');
      } finally {
        if (!ignore) setLoadingCompare(false);
      }
    }
    loadCompare();
    return () => {
      ignore = true;
    };
  }, [compareKey]);

  // Load pivot data — lazy: only when section is open
  const pivotKey = `${pivotYear}|${filter.statuses.join(',')}|${filter.channels.join(',')}|${filter.categories.join(',')}`;
  useEffect(() => {
    if (!pivotOpen) return;
    let ignore = false;
    async function loadPivot() {
      setLoadingPivot(true);
      try {
        const result = await analyticsSalesTargetApi.getTargetPivot({
          year: pivotYear,
          statuses: filter.statuses,
          channels: filter.channels,
          categories: filter.categories
        });
        if (!ignore) setPivotData(result.data.data);
      } catch {
        if (!ignore) setPivotData(null);
      } finally {
        if (!ignore) setLoadingPivot(false);
      }
    }
    loadPivot();
    return () => { ignore = true; };
  }, [pivotOpen, pivotKey, pivotYear]);

  const loading = loadingOptions || loadingCompare;

  const handleExportPivotExcel = useCallback(() => {
    if (!pivotData) return;
    const wb = XLSX.utils.book_new();
    const ws = buildTargetPivotSheet(pivotData);
    XLSX.utils.book_append_sheet(wb, ws, `ยอดขาย VS เป้า ${pivotData.year + 543}`);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `ยอดขาย_VS_เป้า_${pivotData.year + 543}.xlsx`);
  }, [pivotData]);

  const applyPreset = (preset: DatePreset) => {
    setFilter((prev) => ({ ...prev, ...getPresetRange(prev.dateEnd, preset), preset }));
  };

  const hasChartData = (compareData?.chart ?? []).some(
    (row) => row.actualRevenue > 0 || row.targetRevenue > 0
  );

  return (
    <div className="flex flex-col gap-5" data-testid="sales-vs-target-page">
      {/* ── Header ──────────────────────────────── */}
      <header>
        <p className="section-heading">Dashboards</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ยอดขาย <span className="text-emerald-500">VS</span> เป้า
        </h1>
        <p className="text-sm text-gray-500 dark:text-emerald-400">
          เปรียบเทียบยอดขายจริงกับเป้ายอดขายตามช่วงเวลา ช่องทาง และหมวดสินค้า
        </p>
      </header>

      {/* ── Filter Panel ─────────────────────────── */}
      <section className="panel border-l-4 border-emerald-400 dark:border-emerald-600 space-y-3">
        {/* Header + Date presets + Clear */}
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Filters</h3>
          {(filter.statuses.length > 0 || filter.channels.length > 0 || filter.categories.length > 0) && (
            <button type="button" onClick={handleClearFilter}
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors">
              Clear All
            </button>
          )}
          <div className="ml-auto flex gap-1">
            {(['daily', 'monthly', 'yearly'] as DatePreset[]).map((p) => {
              const isActive = filter.preset === p;
              return (
                <button key={p} type="button" onClick={() => applyPreset(p)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150
                    ${isActive
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 dark:bg-emerald-500 dark:text-white'
                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-300'
                    }`}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filter.dateStart}
            onChange={(e) => setFilter({ ...filter, dateStart: e.target.value, preset: undefined })}
            className="input py-1.5 text-xs" />
          <input type="date" value={filter.dateEnd}
            onChange={(e) => setFilter({ ...filter, dateEnd: e.target.value, preset: undefined })}
            className="input py-1.5 text-xs" />
        </div>

        {/* Status */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">Status</p>
          <div className="flex gap-1.5">
            {STATUS_OPTIONS.map((s) => {
              const active = filter.statuses.includes(s);
              return (
                <button key={s} type="button" onClick={() => setFilter({ ...filter, statuses: toggleValue(filter.statuses, s) })}
                  className={`chip ${active ? 'chip-active' : ''}`}>
                  {active && <svg className="inline -ml-0.5 mr-0.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Channels */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">ช่องทาง</p>
          <ChipToggle items={options.channels} selected={filter.channels}
            onToggle={(v) => setFilter({ ...filter, channels: toggleValue(filter.channels, v) })} label="channels" />
        </div>

        {/* Categories */}
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">หมวดสินค้า</p>
          <ChipToggle items={options.categories} selected={filter.categories}
            onToggle={(v) => setFilter({ ...filter, categories: toggleValue(filter.categories, v) })} label="categories" />
        </div>
      </section>

      {/* ── Loading / Error ─────────────────────── */}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {loading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      )}

      {compareData && !loading && (
        <>
          {/* ── KPI Cards ────────────────────────── */}
          <CollapsibleSection title="KPI Overview" desc="สรุปยอดขาย เป้า ส่วนต่าง และ % การบรรลุเป้าหมาย">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricBox label="Actual Revenue" value={compareData.kpi.actualRevenue} icon={ActualIcon}
                color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
              <MetricBox label="Target Revenue" value={compareData.kpi.targetRevenue} icon={TargetIcon}
                color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
              <MetricBox label="Gap (Actual - Target)" icon={GapIcon}
                displayValue={fmtRev(compareData.kpi.gapRevenue)}
                color={compareData.kpi.gapRevenue >= 0
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300'} />
              <MetricBox label="% Achievement" icon={PctIcon}
                displayValue={formatPct(compareData.kpi.achievementPct)}
                color={compareData.kpi.achievementPct != null && compareData.kpi.achievementPct >= 100
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300'} />
            </div>
          </CollapsibleSection>

          {/* ── Revenue vs Target Progress + Gap ──── */}
          {compareData.kpi.targetRevenue > 0 && (
            <CollapsibleSection title="ยอดขายจริง vs เป้ายอดขาย" desc="แถบแสดงความก้าวหน้ายอดขายเทียบกับเป้าหมาย">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">฿{compareData.kpi.actualRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-400 dark:text-emerald-500">/ ฿{compareData.kpi.targetRevenue.toLocaleString()}</p>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <div className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                  style={{ width: `${Math.min(compareData.kpi.achievementPct ?? 0, 100)}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600 dark:text-emerald-300">{formatPct(compareData.kpi.achievementPct)}</span>
                <span className={compareData.kpi.gapRevenue < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-300'}>
                  {compareData.kpi.gapRevenue < 0 ? `ขาดอีก: ฿${Math.abs(compareData.kpi.gapRevenue).toLocaleString()}` : `เกินเป้า: ฿${compareData.kpi.gapRevenue.toLocaleString()}`}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-emerald-400">Gap:</span>
                <GapBadge value={compareData.kpi.gapRevenue} pct={compareData.kpi.achievementPct != null ? compareData.kpi.achievementPct - 100 : null} />
              </div>
            </CollapsibleSection>
          )}

          {/* ── Chart ────────────────────────────── */}
          <CollapsibleSection title="Actual vs Target Revenue" desc="กราฟแท่งเปรียบเทียบยอดขายจริงกับเป้ารายเดือน">
            {!hasChartData ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-emerald-200 dark:border-white/10">
                <p className="text-sm text-gray-400 dark:text-emerald-600">No chart data — adjust filters above</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData.chart} barGap={4}>
                    <CartesianGrid vertical={false} stroke="rgba(16,185,129,0.08)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13 }}
                      formatter={(value: number) => [fmtRev(value)]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="actualRevenue" name="Actual Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="targetRevenue" name="Target Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Breakdown Tables ─────────────────── */}
          <CollapsibleSection title="Breakdown" desc="รายละเอียดแยกตามช่องทางและหมวดสินค้า" defaultOpen={false}>
            <div className="grid gap-4 lg:grid-cols-2">
              <BreakdownTable title="By Channel" rows={compareData.breakdownByChannel} />
              <BreakdownTable title="By Category" rows={compareData.breakdownByCategory} />
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* ── Pivot Table Section (lazy loaded) ──── */}
      <CollapsibleSection
        title="รายงานยอดขาย VS เป้า (Pivot)"
        desc="เป้า / ยอดขายปีนี้ / ยอดขายปีก่อน — รายเดือน × ช่องทาง × หมวดสินค้า"
        defaultOpen={false}
        open={pivotOpen}
        onToggle={() => setPivotOpen((v) => !v)}
        actions={
          <div className="flex items-center gap-2">
            {pivotData && (
              <button type="button" onClick={handleExportPivotExcel}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all">
                Export Excel
              </button>
            )}
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPivotYear((y) => y - 1)}
                className="rounded-lg px-2 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10">
                ‹
              </button>
              <span className="min-w-[60px] text-center text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {pivotYear + 543}
              </span>
              <button type="button" onClick={() => setPivotYear((y) => y + 1)}
                className="rounded-lg px-2 py-1 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10">
                ›
              </button>
            </div>
          </div>
        }
      >
        {loadingPivot && <p className="text-sm text-emerald-600 dark:text-emerald-300 animate-pulse">Loading pivot data...</p>}
        {!loadingPivot && pivotData && <TargetPivotTable data={pivotData} />}
        {!loadingPivot && !pivotData && (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-emerald-200 dark:border-white/10">
            <p className="text-sm text-gray-400 dark:text-emerald-600">No pivot data available</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

