import { useEffect, useMemo, useState, useCallback } from 'react';
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
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  analyticsVsApi,
  type VsCompareResponse,
  type VsOptionsResponse,
  type VsPivotResponse,
  type VsStageFilter
} from '../services/analyticsApi';

type StageState = Required<VsStageFilter> & { preset?: DatePreset };
type DatePreset = 'daily' | 'monthly' | 'yearly';

const STATUS_OPTIONS = ['Complete', 'Cancel'];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseIsoDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 365);
  return { dateStart: toIso(start), dateEnd: toIso(end) };
}

function getPresetRange(currentEnd: string, preset: DatePreset) {
  const end = parseIsoDate(currentEnd);
  const start = new Date(end);
  if (preset === 'daily') start.setDate(end.getDate() - 1);
  else if (preset === 'monthly') start.setDate(1);
  else start.setMonth(0, 1);
  return { dateStart: toIso(start), dateEnd: toIso(end) };
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function pctLabel(value: number | null) {
  if (value == null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function fmt(value: number) {
  return value.toLocaleString();
}

function fmtRev(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
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

/* ── KPI metric mini-card ───────────────────────── */
function MetricBox({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-200 hover:scale-[1.02]
      border-emerald-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.03]`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-emerald-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
          {label === 'Revenue' ? <AnimatedNum value={value} prefix="฿" /> : <AnimatedNum value={value} />}
        </p>
      </div>
    </div>
  );
}

/* ── SVG Icons ──────────────────────────────────── */
const OrdersIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
const RevenueIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
const QtyIcon = <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>;

/* ── Delta badge ────────────────────────────────── */
function DeltaBadge({ abs, pct }: { abs: number; pct: number | null }) {
  const pos = abs >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold
      ${pos ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'}`}>
      {pos ? '▲' : '▼'} {fmt(Math.abs(abs))} {pct != null && <span className="opacity-70">({pctLabel(pct)})</span>}
    </span>
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

/* ── Compact Stage Filter Panel ─────────────────── */
function StagePanel({
  label, color, stage, options, onChange
}: {
  label: string; color: 'emerald' | 'blue'; stage: StageState; options: VsOptionsResponse;
  onChange: (next: StageState) => void;
}) {
  const accent = color === 'emerald'
    ? 'border-emerald-400 dark:border-emerald-600'
    : 'border-blue-400 dark:border-blue-600';
  const dot = color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500';

  const applyPreset = (preset: DatePreset) => {
    onChange({ ...stage, ...getPresetRange(stage.dateEnd, preset), preset });
  };

  return (
    <div className={`panel border-l-4 ${accent} space-y-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{label}</h3>
        {(stage.statuses.length > 0 || stage.channels.length > 0 || stage.categories.length > 0) && (
          <button type="button"
            onClick={() => onChange({ ...getDefaultDateRange(), statuses: [], channels: [], categories: [], preset: undefined })}
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors">
            Clear
          </button>
        )}
        <div className="ml-auto flex gap-1">
          {(['daily', 'monthly', 'yearly'] as DatePreset[]).map((p) => {
            const isActive = stage.preset === p;
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
        <input type="date" value={stage.dateStart}
          onChange={(e) => onChange({ ...stage, dateStart: e.target.value, preset: undefined })}
          className="input py-1.5 text-xs" />
        <input type="date" value={stage.dateEnd}
          onChange={(e) => onChange({ ...stage, dateEnd: e.target.value, preset: undefined })}
          className="input py-1.5 text-xs" />
      </div>

      {/* Status */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">Status</p>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((s) => {
            const active = stage.statuses.includes(s);
            return (
              <button key={s} type="button" onClick={() => onChange({ ...stage, statuses: toggleValue(stage.statuses, s) })}
                className={`chip ${active ? 'chip-active' : ''}`}>
                {active && <svg className="inline -ml-0.5 mr-0.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel chips */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">ช่องทาง</p>
        <ChipToggle items={options.channels} selected={stage.channels}
          onToggle={(v) => onChange({ ...stage, channels: toggleValue(stage.channels, v) })} label="channels" />
      </div>

      {/* Category chips */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-emerald-500">หมวดสินค้า</p>
        <ChipToggle items={options.categories} selected={stage.categories}
          onToggle={(v) => onChange({ ...stage, categories: toggleValue(stage.categories, v) })} label="categories" />
      </div>
    </div>
  );
}

/* ── Breakdown mini-table (max 5 rows, scrollable) ── */
function MiniTable({ rows, max = 5 }: { rows: Array<{ key: string; orders: number; revenue: number; quantity: number }>; max?: number }) {
  if (rows.length === 0) return <p className="py-3 text-center text-xs text-gray-400 dark:text-emerald-600">No data</p>;
  const display = rows.slice(0, max);
  return (
    <div className="overflow-auto rounded-lg border border-emerald-100 dark:border-white/[0.06]" style={{ maxHeight: '220px' }}>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Orders</th><th>Revenue</th><th>Qty</th></tr></thead>
        <tbody>
          {display.map((r) => (
            <tr key={r.key}><td>{r.key}</td><td className="tabular-nums">{fmt(r.orders)}</td><td className="tabular-nums">{fmtRev(r.revenue)}</td><td className="tabular-nums">{fmt(r.quantity)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
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

/* ── Channel header color palette (darker for ช่องทาง row) ── */
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
/* ── Category header color palette (lighter for หมวดสินค้า row) ── */
const CHANNEL_COLORS_LIGHT = [
  { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-violet-50 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
];

/* ── Pivot Table Component ──────────────────────── */
function PivotTable({ data, metric }: { data: VsPivotResponse; metric: 'revenue' | 'quantity' | 'orders' }) {
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

  // Compute column totals
  const colTotals = data.columnHeaders.map((_, ci) =>
    data.months.reduce((sum, m) => sum + (m.cells[ci]?.[metric] ?? 0), 0)
  );

  // Build a map: colIdx -> { channelGroupIndex, isFirstInGroup }
  const colMeta = (() => {
    const map: Array<{ gi: number; isFirst: boolean }> = [];
    channelGroups.forEach((g, gi) => {
      g.categories.forEach((_, catIdx) => {
        map.push({ gi, isFirst: catIdx === 0 });
      });
    });
    return map;
  })();

  // Border colors per channel group for the left divider
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

  // Light tinted background per channel for data cells
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

  return (
    <div className="overflow-auto rounded-lg border border-emerald-100 dark:border-white/[0.06]" style={{ maxHeight: '420px' }}>
      <table className="min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-20">
          {/* Row 1: Channel groups — bold colored headers */}
          <tr>
            <th rowSpan={2} className="sticky left-0 z-30 px-3 py-2 bg-gray-50 dark:bg-[#0c1f16] min-w-[90px] text-center align-middle border-b border-emerald-200 dark:border-white/10">
              วันที่
            </th>
            {channelGroups.map((g, gi) => {
              const color = CHANNEL_COLORS_DARK[gi % CHANNEL_COLORS_DARK.length];
              const border = CHANNEL_BORDER_COLORS[gi % CHANNEL_BORDER_COLORS.length];
              return (
                <th key={g.channel} colSpan={g.categories.length}
                  className={`px-3 py-2.5 text-center font-bold text-sm tracking-wide border-l-2 ${border} ${color.bg} ${color.text}`}>
                  {g.channel}
                </th>
              );
            })}
            <th rowSpan={2} className="px-3 py-2 text-center align-middle border-l-2 border-gray-300 dark:border-white/20 min-w-[80px] bg-gray-100 dark:bg-white/[0.06] font-bold border-b border-emerald-200 dark:border-white/10">
              รวม
            </th>
          </tr>
          {/* Row 2: Category sub-headers — light tint */}
          <tr>
            {channelGroups.flatMap((g, gi) => {
              const color = CHANNEL_COLORS_LIGHT[gi % CHANNEL_COLORS_LIGHT.length];
              const border = CHANNEL_BORDER_COLORS[gi % CHANNEL_BORDER_COLORS.length];
              return g.categories.map((c, catIdx) => (
                <th key={`${g.channel}-${c.category}`}
                  className={`px-3 py-1.5 text-center min-w-[80px] whitespace-nowrap text-[10px] font-semibold border-b border-emerald-200 dark:border-white/10
                    ${catIdx === 0 ? `border-l-2 ${border}` : 'border-l border-white/20 dark:border-white/5'}
                    ${color.bg} ${color.text}`}>
                  {c.category}
                </th>
              ));
            })}
          </tr>
        </thead>
        <tbody>
          {data.months.map((m) => {
            const rowTotal = m.cells.reduce((sum, c) => sum + (c[metric] ?? 0), 0);
            if (rowTotal === 0 && m.cells.every((c) => (c[metric] ?? 0) === 0)) return null;
            return (
              <tr key={m.monthIndex} className="border-b border-emerald-100/60 dark:border-white/[0.06] hover:bg-emerald-50/40 dark:hover:bg-white/[0.03]">
                <td className="sticky left-0 z-10 px-3 py-2 bg-white dark:bg-[#0f2119] font-semibold text-center">{m.label}</td>
                {m.cells.map((c, ci) => {
                  const meta = colMeta[ci];
                  const border = CHANNEL_BORDER_COLORS[meta.gi % CHANNEL_BORDER_COLORS.length];
                  const cellBg = CHANNEL_CELL_BG[meta.gi % CHANNEL_CELL_BG.length];
                  return (
                    <td key={ci} className={`px-3 py-2 tabular-nums text-right ${cellBg} ${meta.isFirst ? `border-l-2 ${border}` : ''}`}>
                      {metric === 'revenue' ? fmtRev(c[metric] ?? 0) : fmt(c[metric] ?? 0)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 tabular-nums text-right font-semibold border-l-2 border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.02]">
                  {metric === 'revenue' ? fmtRev(rowTotal) : fmt(rowTotal)}
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          <tr className="border-t-2 border-emerald-300 dark:border-emerald-700 font-bold">
            <td className="sticky left-0 z-10 px-3 py-2 bg-emerald-50 dark:bg-[#0c1f16] text-center">รวมทั้งหมด</td>
            {colTotals.map((t, ci) => {
              const meta = colMeta[ci];
              const border = CHANNEL_BORDER_COLORS[meta.gi % CHANNEL_BORDER_COLORS.length];
              const cellBg = CHANNEL_CELL_BG[meta.gi % CHANNEL_CELL_BG.length];
              return (
                <td key={ci} className={`px-3 py-2 tabular-nums text-right ${cellBg} ${meta.isFirst ? `border-l-2 ${border}` : ''}`}>
                  {metric === 'revenue' ? fmtRev(t) : fmt(t)}
                </td>
              );
            })}
            <td className="px-3 py-2 tabular-nums text-right border-l-2 border-gray-300 dark:border-white/20 bg-gray-50/50 dark:bg-white/[0.02]">
              {metric === 'revenue' ? fmtRev(colTotals.reduce((a, b) => a + b, 0)) : fmt(colTotals.reduce((a, b) => a + b, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ── Excel Export ───────────────────────────────── */
function buildPivotSheet(data: VsPivotResponse, label: string, metric: 'revenue' | 'quantity' | 'orders') {
  const channelGroups: Array<{ channel: string; categories: Array<{ category: string; colIdx: number }> }> = [];
  data.columnHeaders.forEach((h, idx) => {
    let g = channelGroups.find((x) => x.channel === h.channel);
    if (!g) { g = { channel: h.channel, categories: [] }; channelGroups.push(g); }
    g.categories.push({ category: h.category, colIdx: idx });
  });

  const rows: Array<Array<string | number>> = [];

  // Header row 1: channel groups
  const headerRow1: Array<string | number> = ['วันที่'];
  for (const g of channelGroups) {
    headerRow1.push(g.channel);
    for (let i = 1; i < g.categories.length; i++) headerRow1.push('');
  }
  headerRow1.push('รวม');
  rows.push(headerRow1);

  // Header row 2: categories
  const headerRow2: Array<string | number> = [''];
  for (const g of channelGroups) {
    for (const c of g.categories) headerRow2.push(c.category);
  }
  headerRow2.push('');
  rows.push(headerRow2);

  // Data rows
  for (const m of data.months) {
    const rowTotal = m.cells.reduce((sum, c) => sum + (c[metric] ?? 0), 0);
    const row: Array<string | number> = [m.label];
    for (const c of m.cells) row.push(c[metric] ?? 0);
    row.push(rowTotal);
    rows.push(row);
  }

  // Totals row
  const totalsRow: Array<string | number> = ['รวมทั้งหมด'];
  const colTotals = data.columnHeaders.map((_, ci) =>
    data.months.reduce((sum, m) => sum + (m.cells[ci]?.[metric] ?? 0), 0)
  );
  for (const t of colTotals) totalsRow.push(t);
  totalsRow.push(colTotals.reduce((a, b) => a + b, 0));
  rows.push(totalsRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Merge channel header cells
  const merges: XLSX.Range[] = [];
  let colOffset = 1;
  for (const g of channelGroups) {
    if (g.categories.length > 1) {
      merges.push({ s: { r: 0, c: colOffset }, e: { r: 0, c: colOffset + g.categories.length - 1 } });
    }
    colOffset += g.categories.length;
  }
  ws['!merges'] = merges;

  // Set column widths
  ws['!cols'] = [{ wch: 14 }, ...data.columnHeaders.map(() => ({ wch: 14 })), { wch: 14 }];

  return ws;
}

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
export function SalesByChannelPage() {
  const defaults = useMemo(getDefaultDateRange, []);
  const [stageA, setStageA] = useState<StageState>({ ...defaults, statuses: [], channels: [], categories: [] });
  const [stageB, setStageB] = useState<StageState>({ ...defaults, statuses: [], channels: [], categories: [] });

  const [optionsA, setOptionsA] = useState<VsOptionsResponse>({ channels: [], categories: [] });
  const [optionsB, setOptionsB] = useState<VsOptionsResponse>({ channels: [], categories: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareData, setCompareData] = useState<VsCompareResponse | null>(null);
  const [pivotA, setPivotA] = useState<VsPivotResponse | null>(null);
  const [pivotB, setPivotB] = useState<VsPivotResponse | null>(null);
  const [loadingPivot, setLoadingPivot] = useState(false);
  const [pivotMetric, setPivotMetric] = useState<'revenue' | 'quantity' | 'orders'>('revenue');
  const [chartMetric, setChartMetric] = useState<'orders' | 'revenue' | 'quantity'>('revenue');
  const [pivotOpen, setPivotOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optionsKeyA = `${stageA.dateStart}|${stageA.dateEnd}|${stageA.statuses.join(',')}`;
  const optionsKeyB = `${stageB.dateStart}|${stageB.dateEnd}|${stageB.statuses.join(',')}`;

  useEffect(() => {
    let ignore = false;
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [a, b] = await Promise.all([
          analyticsVsApi.getVsOptions({ dateStart: stageA.dateStart, dateEnd: stageA.dateEnd, statuses: stageA.statuses }),
          analyticsVsApi.getVsOptions({ dateStart: stageB.dateStart, dateEnd: stageB.dateEnd, statuses: stageB.statuses })
        ]);
        if (ignore) return;
        setOptionsA(a.data.data);
        setOptionsB(b.data.data);
        setStageA((prev) => ({
          ...prev,
          channels: prev.channels.filter((ch) => a.data.data.channels.includes(ch)),
          categories: prev.categories.filter((cg) => a.data.data.categories.includes(cg))
        }));
        setStageB((prev) => ({
          ...prev,
          channels: prev.channels.filter((ch) => b.data.data.channels.includes(ch)),
          categories: prev.categories.filter((cg) => b.data.data.categories.includes(cg))
        }));
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load filter options');
      } finally {
        if (!ignore) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => { ignore = true; };
  }, [optionsKeyA, optionsKeyB, stageA.dateStart, stageA.dateEnd, stageB.dateStart, stageB.dateEnd, stageA.statuses, stageB.statuses]);

  useEffect(() => {
    let ignore = false;
    async function loadCompare() {
      setLoadingCompare(true);
      setError(null);
      try {
        const result = await analyticsVsApi.compareVs({ stageA, stageB });
        if (!ignore) setCompareData(result.data.data);
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to compare');
      } finally {
        if (!ignore) setLoadingCompare(false);
      }
    }
    loadCompare();
    return () => { ignore = true; };
  }, [JSON.stringify(stageA), JSON.stringify(stageB)]);

  // Load pivot data — lazy: only when section is open
  useEffect(() => {
    if (!pivotOpen) return;
    let ignore = false;
    async function loadPivots() {
      setLoadingPivot(true);
      try {
        const [a, b] = await Promise.all([
          analyticsVsApi.getPivot(stageA, 'daily'),
          analyticsVsApi.getPivot(stageB, 'daily')
        ]);
        if (!ignore) {
          setPivotA(a.data.data);
          setPivotB(b.data.data);
        }
      } catch {
        if (!ignore) { setPivotA(null); setPivotB(null); }
      } finally {
        if (!ignore) setLoadingPivot(false);
      }
    }
    loadPivots();
    return () => { ignore = true; };
  }, [pivotOpen, JSON.stringify(stageA), JSON.stringify(stageB)]);

  const handleExportExcel = useCallback(() => {
    if (!pivotA || !pivotB) return;
    const wb = XLSX.utils.book_new();
    const wsA = buildPivotSheet(pivotA, 'Stage A', pivotMetric);
    const wsB = buildPivotSheet(pivotB, 'Stage B', pivotMetric);
    XLSX.utils.book_append_sheet(wb, wsA, 'Stage A');
    XLSX.utils.book_append_sheet(wb, wsB, 'Stage B');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `รายงานการขาย_${stageA.dateStart}_to_${stageA.dateEnd}.xlsx`);
  }, [pivotA, pivotB, pivotMetric, stageA.dateStart, stageA.dateEnd]);

  const loading = loadingOptions || loadingCompare;

  return (
    <div className="flex flex-col gap-5" data-testid="sales-by-channel-vs-page">
      {/* ── Header ──────────────────────────────── */}
      <header>
        <p className="section-heading">Dashboards</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ยอดขายรายช่องทาง <span className="text-emerald-500">VS</span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-emerald-400">
          เปรียบเทียบ KPI ระหว่าง 2 ชุดข้อมูล — Stage A vs Stage B
        </p>
      </header>

      {/* ── Stage Filters (side by side) ────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <StagePanel label="Stage A" color="emerald" stage={stageA} options={optionsA} onChange={setStageA} />
        <StagePanel label="Stage B" color="blue" stage={stageB} options={optionsB} onChange={setStageB} />
      </div>

      {/* ── Loading / Error ─────────────────────── */}
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {loading && (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
          <div />
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
        </div>
      )}

      {/* ── Results ─────────────────────────────── */}
      {compareData && !loading && (
        <>
          {/* 1) Delta Summary */}
          <CollapsibleSection title="Delta (A - B)" desc="ผลต่างระหว่าง Stage A และ Stage B">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">{OrdersIcon}</div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-emerald-400">Orders</span>
                </div>
                <DeltaBadge abs={compareData.delta.orders.absolute} pct={compareData.delta.orders.percent} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-blue-50/40 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">{RevenueIcon}</div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-emerald-400">Revenue</span>
                </div>
                <DeltaBadge abs={compareData.delta.revenue.absolute} pct={compareData.delta.revenue.percent} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-violet-50/40 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">{QtyIcon}</div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-emerald-400">Quantity</span>
                </div>
                <DeltaBadge abs={compareData.delta.quantity.absolute} pct={compareData.delta.quantity.percent} />
              </div>
            </div>
          </CollapsibleSection>

          {/* 2) KPI Comparison + Chart */}
          <CollapsibleSection title="KPI Comparison" desc="เปรียบเทียบ KPI รวม Orders, Revenue, Quantity ระหว่าง 2 Stage">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] items-stretch">
              {/* Stage A KPI */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Stage A</h3>
                </div>
                <MetricBox label="Orders" value={compareData.stageA.kpi.totalOrders} icon={OrdersIcon}
                  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
                <MetricBox label="Revenue" value={compareData.stageA.kpi.totalRevenue} icon={RevenueIcon}
                  color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                <MetricBox label="Quantity" value={compareData.stageA.kpi.totalQuantity} icon={QtyIcon}
                  color="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300" />
              </div>

              {/* VS divider */}
              <div className="hidden lg:flex flex-col items-center justify-center px-2">
                <div className="h-full w-px bg-gradient-to-b from-transparent via-emerald-300 to-transparent dark:via-emerald-700 relative">
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white text-xs font-black shadow-lg">
                    VS
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center lg:hidden py-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 text-white text-[10px] font-black shadow">VS</span>
              </div>

              {/* Stage B KPI */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Stage B</h3>
                </div>
                <MetricBox label="Orders" value={compareData.stageB.kpi.totalOrders} icon={OrdersIcon}
                  color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300" />
                <MetricBox label="Revenue" value={compareData.stageB.kpi.totalRevenue} icon={RevenueIcon}
                  color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300" />
                <MetricBox label="Quantity" value={compareData.stageB.kpi.totalQuantity} icon={QtyIcon}
                  color="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300" />
              </div>
            </div>

            {/* Chart */}
            <div className="divider my-4" />
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Chart</h4>
              <div className="flex gap-1">
                {(['orders', 'revenue', 'quantity'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setChartMetric(m)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      chartMetric === m
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-400 dark:hover:bg-white/20'
                    }`}>
                    {m === 'orders' ? 'Orders' : m === 'revenue' ? 'Revenue' : 'Quantity'}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              const kpiA = compareData.stageA.kpi;
              const kpiB = compareData.stageB.kpi;
              const valA = chartMetric === 'orders' ? kpiA.totalOrders : chartMetric === 'revenue' ? kpiA.totalRevenue : kpiA.totalQuantity;
              const valB = chartMetric === 'orders' ? kpiB.totalOrders : chartMetric === 'revenue' ? kpiB.totalRevenue : kpiB.totalQuantity;
              const singleChartData = [{ name: chartMetric === 'orders' ? 'Orders' : chartMetric === 'revenue' ? 'Revenue' : 'Quantity', stageA: valA, stageB: valB }];
              const isRev = chartMetric === 'revenue';
              return valA === 0 && valB === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-emerald-200 dark:border-white/10">
                  <p className="text-sm text-gray-400 dark:text-emerald-600">No data for this metric</p>
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={singleChartData} barGap={8} barSize={60}>
                      <CartesianGrid vertical={false} stroke="rgba(16,185,129,0.08)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => isRev ? (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)) : (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid rgba(16,185,129,0.2)', fontSize: 13 }}
                        formatter={(value: number) => [isRev ? fmtRev(value) : fmt(value)]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="stageA" name="Stage A" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="stageB" name="Stage B" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </CollapsibleSection>

          {/* 3) Top Channels */}
          <CollapsibleSection title="Top Channels" desc="5 อันดับช่องทางขายยอดนิยมของแต่ละ Stage" defaultOpen={false}>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] items-start">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Stage A
                </p>
                <MiniTable rows={compareData.stageA.topChannels} />
              </div>
              <div className="hidden lg:flex items-center justify-center self-stretch px-1">
                <div className="h-full w-px bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent dark:via-emerald-700/50" />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Stage B
                </p>
                <MiniTable rows={compareData.stageB.topChannels} />
              </div>
            </div>
          </CollapsibleSection>

          {/* 4) Top Categories */}
          <CollapsibleSection title="Top Categories" desc="5 อันดับหมวดสินค้ายอดนิยมของแต่ละ Stage" defaultOpen={false}>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] items-start">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Stage A
                </p>
                <MiniTable rows={compareData.stageA.topCategories} />
              </div>
              <div className="hidden lg:flex items-center justify-center self-stretch px-1">
                <div className="h-full w-px bg-gradient-to-b from-transparent via-emerald-300/50 to-transparent dark:via-emerald-700/50" />
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> Stage B
                </p>
                <MiniTable rows={compareData.stageB.topCategories} />
              </div>
            </div>
          </CollapsibleSection>
        </>
      )}

      {/* 5) Pivot Table — lazy loaded */}
      <CollapsibleSection
        title="รายงานการขาย (Pivot)"
        desc="วันที่ × ช่องทาง / หมวดสินค้า — Stage A vs Stage B"
        open={pivotOpen}
        onToggle={() => setPivotOpen((v) => !v)}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
              {(['revenue', 'quantity', 'orders'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setPivotMetric(m)}
                  className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150
                    ${pivotMetric === m
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-white/[0.04]'}`}>
                  {m}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleExportExcel}
              disabled={!pivotA || !pivotB || loadingPivot}
              className="btn-sm btn-primary gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        }
      >
        {loadingPivot ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Stage A
                <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({stageA.dateStart} — {stageA.dateEnd})</span>
              </p>
              {pivotA ? <PivotTable data={pivotA} metric={pivotMetric} /> : <p className="text-xs text-gray-400">No data</p>}
            </div>
            <div className="divider" />
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-emerald-400">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" /> Stage B
                <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({stageB.dateStart} — {stageB.dateEnd})</span>
              </p>
              {pivotB ? <PivotTable data={pivotB} metric={pivotMetric} /> : <p className="text-xs text-gray-400">No data</p>}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
