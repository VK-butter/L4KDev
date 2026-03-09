import { Router } from 'express';
import { z } from 'zod';
import {
  getCategoryBreakdown,
  getDrilldown,
  getSummary,
  getTimeseries
} from '../../services/analytics/salesQueryService';
import { getPool } from '../../db/pool';
import type { FieldDef, PoolClient } from 'pg';

const router = Router();
const SKU_TABLES = {
  current: 'l4k_model."SKU_dataCurrent"',
  previous: 'l4k_model."SKU_dataPrevious"'
} as const;

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO date');

const baseFiltersSchema = z.object({
  dateStart: isoDateSchema,
  dateEnd: isoDateSchema,
  categories: z
    .string()
    .optional()
    .transform((value) =>
      value ? value.split(',').filter(Boolean) : undefined
    ),
  statuses: z
    .string()
    .optional()
    .transform((value) =>
      value ? (value.split(',').filter(Boolean) as Array<'Pending' | 'Fulfilled' | 'Cancelled'>) : undefined
    )
});

const drilldownSchema = baseFiltersSchema.extend({
  category: z.string().optional(),
  status: z.enum(['Pending', 'Fulfilled', 'Cancelled']).optional(),
  page: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined)),
  pageSize: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
});

const vsStageFilterSchema = z.object({
  dateStart: isoDateSchema,
  dateEnd: isoDateSchema,
  statuses: z.array(z.string()).optional().default([]),
  channels: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([])
});

const vsCompareSchema = z.object({
  stageA: vsStageFilterSchema,
  stageB: vsStageFilterSchema
});

const salesTargetFilterSchema = z.object({
  dateStart: isoDateSchema,
  dateEnd: isoDateSchema,
  statuses: z.array(z.string()).optional().default([]),
  channels: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([])
});

router.get('/orders/summary', async (req, res, next) => {
  try {
    const filters = baseFiltersSchema.parse(req.query);
    const summary = await getSummary(filters);
    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/by-category', async (req, res, next) => {
  try {
    const filters = baseFiltersSchema.parse(req.query);
    const breakdown = await getCategoryBreakdown(filters);
    res.json({ data: breakdown });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/timeseries', async (req, res, next) => {
  try {
    const filters = baseFiltersSchema.parse(req.query);
    const points = await getTimeseries(filters);
    res.json({ data: points });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/drilldown', async (req, res, next) => {
  try {
    const payload = drilldownSchema.parse(req.query);
    const data = await getDrilldown({
      ...payload,
      page: payload.page ?? 1,
      pageSize: payload.pageSize ?? 20
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

const MONTH_ALIASES: Array<{ idx: number; tokens: string[] }> = [
  { idx: 1, tokens: ['jan', 'january', 'มค', 'มกราคม', 'm1', 'm01', 'month1', 'month01', '01'] },
  { idx: 2, tokens: ['feb', 'february', 'กพ', 'กุมภาพันธ์', 'm2', 'm02', 'month2', 'month02', '02'] },
  { idx: 3, tokens: ['mar', 'march', 'มีค', 'มีนาคม', 'm3', 'm03', 'month3', 'month03', '03'] },
  { idx: 4, tokens: ['apr', 'april', 'เมย', 'เมษายน', 'm4', 'm04', 'month4', 'month04', '04'] },
  { idx: 5, tokens: ['may', 'พค', 'พฤษภาคม', 'm5', 'm05', 'month5', 'month05', '05'] },
  { idx: 6, tokens: ['jun', 'june', 'มิย', 'มิถุนายน', 'm6', 'm06', 'month6', 'month06', '06'] },
  { idx: 7, tokens: ['jul', 'july', 'กค', 'กรกฎาคม', 'm7', 'm07', 'month7', 'month07', '07'] },
  { idx: 8, tokens: ['aug', 'august', 'สค', 'สิงหาคม', 'm8', 'm08', 'month8', 'month08', '08'] },
  { idx: 9, tokens: ['sep', 'sept', 'september', 'กย', 'กันยายน', 'm9', 'm09', 'month9', 'month09', '09'] },
  { idx: 10, tokens: ['oct', 'october', 'ตค', 'ตุลาคม', 'm10', 'month10'] },
  { idx: 11, tokens: ['nov', 'november', 'พย', 'พฤศจิกายน', 'm11', 'month11'] },
  { idx: 12, tokens: ['dec', 'december', 'ธค', 'ธันวาคม', 'm12', 'month12'] }
];

function monthLabel(idx: number | null): string {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!idx || idx < 1 || idx > 12) return 'Other';
  return labels[idx - 1];
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f]/g, '');
}

function parseMonth(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const n = Number(trimmed);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return Math.round(n);
    const norm = normalizeKey(trimmed);
    const match = MONTH_ALIASES.find((m) =>
      m.tokens.some((t) => norm === t || norm.endsWith(t) || norm.includes(t))
    );
    if (match) return match.idx;
  }
  return null;
}

type MonthLayout =
  | {
      type: 'columns';
      monthColumns: Array<{ monthIndex: number; qtyColumn?: string; amountColumn?: string }>;
    }
  | { type: 'rows'; monthColumn: string; qtyColumn?: string; amountColumn?: string }
  | null;

function isQtyLike(name: string) {
  const norm = normalizeKey(name);
  return (
    norm.includes('qty') ||
    norm.includes('quantity') ||
    norm.includes('จำนวน') ||
    norm.includes('ยอดขายจำนวน')
  );
}

function isAmountLike(name: string) {
  const norm = normalizeKey(name);
  return (
    norm.includes('ยอดรวม') ||
    norm.includes('ยอดขาย') ||
    norm.includes('ยอดสุทธิ') ||
    norm.includes('ราคา') ||
    norm.includes('amount') ||
    norm.includes('total') ||
    norm.includes('value') ||
    norm.includes('price')
  );
}

function detectMonthLayout(fields: FieldDef[]): MonthLayout {
  const monthColumns: Array<{ monthIndex: number; qtyColumn?: string; amountColumn?: string }> =
    [];
  for (const f of fields) {
    const norm = normalizeKey(f.name);
    const matched = MONTH_ALIASES.find((m) =>
      m.tokens.some((t) => norm === t || norm.endsWith(t) || norm.includes(t))
    );
    if (matched) {
      const isAmount = isAmountLike(f.name);
      const entry =
        monthColumns.find((c) => c.monthIndex === matched.idx) ??
        (() => {
          const fresh = { monthIndex: matched.idx } as {
            monthIndex: number;
            qtyColumn?: string;
            amountColumn?: string;
          };
          monthColumns.push(fresh);
          return fresh;
        })();
      if (isAmount) entry.amountColumn = entry.amountColumn ?? f.name;
      else entry.qtyColumn = entry.qtyColumn ?? f.name;
    }
  }
  if (monthColumns.length >= 3) {
    const sorted = monthColumns.sort((a, b) => a.monthIndex - b.monthIndex);
    return { type: 'columns', monthColumns: sorted };
  }

  const monthField = fields.find((f) => {
    const norm = normalizeKey(f.name);
    return norm.includes('month') || norm.includes('เดือน');
  });
  const qtyField = fields.find((f) => isQtyLike(f.name));
  const amountField = fields.find((f) => isAmountLike(f.name));
  if (monthField && (qtyField || amountField)) {
    return {
      type: 'rows',
      monthColumn: monthField.name,
      qtyColumn: qtyField?.name,
      amountColumn: amountField?.name
    };
  }
  return null;
}

async function loadMonthTotals(client: PoolClient, table: string) {
  const sample = await client.query(`SELECT * FROM ${table} LIMIT 5`);
  const fields = sample.fields as FieldDef[];
  const layout = detectMonthLayout(fields);
  if (!layout) return [];

  if (layout.type === 'columns') {
    const selectParts: string[] = [];
    for (const m of layout.monthColumns) {
      const qtyAlias = quoteIdent(`qty_${m.monthIndex}`);
      const amtAlias = quoteIdent(`amt_${m.monthIndex}`);
      selectParts.push(
        m.qtyColumn
          ? `SUM(${quoteIdent(m.qtyColumn)})::numeric AS ${qtyAlias}`
          : `0::numeric AS ${qtyAlias}`
      );
      selectParts.push(
        m.amountColumn
          ? `SUM(${quoteIdent(m.amountColumn)})::numeric AS ${amtAlias}`
          : `0::numeric AS ${amtAlias}`
      );
    }
    const sql = `SELECT ${selectParts.join(', ')} FROM ${table}`;
    const res = await client.query(sql);
    const row = res.rows[0] ?? {};
    return layout.monthColumns.map((m) => {
      const qtyKey = `qty_${m.monthIndex}`;
      const amtKey = `amt_${m.monthIndex}`;
      const quantity = row[qtyKey] !== undefined ? Number(row[qtyKey]) : 0;
      const amount = row[amtKey] !== undefined ? Number(row[amtKey]) : 0;
      return {
        monthIndex: m.monthIndex,
        label: monthLabel(m.monthIndex),
        quantity,
        amount
      };
    });
  }

  const monthCol = quoteIdent(layout.monthColumn);
  const qtyCol = layout.qtyColumn ? quoteIdent(layout.qtyColumn) : null;
  const amtCol = layout.amountColumn ? quoteIdent(layout.amountColumn) : null;
  const selectBits = [`${monthCol} AS month_value`];
  if (qtyCol) selectBits.push(`SUM(${qtyCol})::numeric AS qty`);
  if (amtCol) selectBits.push(`SUM(${amtCol})::numeric AS amt`);
  const sql = `SELECT ${selectBits.join(', ')} FROM ${table} GROUP BY 1`;
  const res = await client.query(sql);
  return res.rows.map((r) => {
    const idx = parseMonth(r.month_value);
    const quantity = Number(r.qty ?? 0);
    const amount = Number(r.amt ?? 0);
    return {
      monthIndex: idx,
      label: idx ? monthLabel(idx) : String(r.month_value ?? ''),
      quantity,
      amount
    };
  });
}

function mergeMonthTotals(
  current: Array<{
    monthIndex: number | null;
    label: string;
    quantity: number;
    amount: number;
  }>,
  previous: Array<{
    monthIndex: number | null;
    label: string;
    quantity: number;
    amount: number;
  }>
) {
  const mapKey = (m: { monthIndex: number | null; label: string }) =>
    m.monthIndex != null ? `idx-${m.monthIndex}` : `label-${m.label}`;
  const keys = new Map<string, { monthIndex: number | null; label: string }>();
  [...current, ...previous].forEach((m) => {
    const key = mapKey(m);
    if (!keys.has(key)) keys.set(key, { monthIndex: m.monthIndex, label: m.label });
  });
  const ordered = Array.from(keys.values()).sort((a, b) => {
    if (a.monthIndex && b.monthIndex) return a.monthIndex - b.monthIndex;
    if (a.monthIndex && !b.monthIndex) return -1;
    if (!a.monthIndex && b.monthIndex) return 1;
    return a.label.localeCompare(b.label);
  });
  const currentMap = new Map(
    current.map((m) => [mapKey(m), m])
  );
  const previousMap = new Map(
    previous.map((m) => [mapKey(m), m])
  );
  return ordered.map((m) => ({
    monthLabel: m.label,
    monthIndex: m.monthIndex,
    currentQty: currentMap.get(mapKey(m))?.quantity ?? 0,
    previousQty: previousMap.get(mapKey(m))?.quantity ?? 0,
    currentAmount: currentMap.get(mapKey(m))?.amount ?? 0,
    previousAmount: previousMap.get(mapKey(m))?.amount ?? 0
  }));
}

function detectAmountField(fields: FieldDef[]): string | null {
  const match = fields.find((f) => isAmountLike(f.name));
  return match ? match.name : null;
}

async function sumAmountColumn(client: PoolClient, table: string) {
  const sample = await client.query(`SELECT * FROM ${table} LIMIT 1`);
  const fields = sample.fields as FieldDef[];
  const amountField = detectAmountField(fields);
  if (!amountField) return null;
  const sql = `SELECT SUM(${quoteIdent(amountField)})::numeric AS total FROM ${table}`;
  const res = await client.query(sql);
  return res.rows[0]?.total !== undefined ? Number(res.rows[0].total) : null;
}

type VsStageFilter = z.infer<typeof vsStageFilterSchema>;
type SalesTargetFilter = z.infer<typeof salesTargetFilterSchema>;

type VsColumns = {
  date: string;
  status: string | null;
  revenue: string | null;
  quantity: string | null;
  channel: string | null;
  customer: string | null;
  category: string | null;
  order: string | null;
};

function toUniqueStrings(values: string[]) {
  const normalized = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return Array.from(new Set(normalized));
}

function normalizeVsStatuses(values: string[]) {
  const mapped = values
    .map((s) => s.trim().toLowerCase())
    .map((s) => {
      if (['complete', 'completed', 'saled', 'fulfilled'].includes(s)) return 'Complete';
      if (['cancel', 'cancelled', 'canceled'].includes(s)) return 'Cancel';
      if (s === 'unknown') return 'Unknown';
      return null;
    })
    .filter((s): s is 'Complete' | 'Cancel' | 'Unknown' => Boolean(s));
  return Array.from(new Set(mapped));
}

function pickColumn(fieldNames: string[], candidates: string[]) {
  for (const candidate of candidates) {
    const exact = fieldNames.find((name) => normalizeKey(name) === normalizeKey(candidate));
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const contains = fieldNames.find((name) =>
      normalizeKey(name).includes(normalizeKey(candidate))
    );
    if (contains) return contains;
  }
  return null;
}

function resolveVsColumns(fieldNames: string[]): VsColumns {
  const envDate = process.env.RAW_DATE_COLUMN?.trim();
  const envStatus = process.env.RAW_STATUS_COLUMN?.trim();
  const envRevenue = process.env.RAW_REVENUE_COLUMN?.trim();
  const envQty = process.env.RAW_QUANTITY_COLUMN?.trim();

  const date =
    (envDate && fieldNames.find((n) => n === envDate)) ||
    pickColumn(fieldNames, ['order date', 'date_order', 'orderdate', 'date']) ||
    'order_date';

  return {
    date,
    status:
      (envStatus && fieldNames.find((n) => n === envStatus)) ||
      pickColumn(fieldNames, ['status', 'orderstatus', 'itemstatus', 'sale_status', '\u0e2a\u0e16\u0e32\u0e19\u0e30']),
    revenue:
      (envRevenue && fieldNames.find((n) => n === envRevenue)) ||
      pickColumn(fieldNames, ['\u0e23\u0e27\u0e21\u0e23\u0e32\u0e04\u0e32', 'revenue', 'amount', 'totalprice', 'price', '\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21']),
    quantity:
      (envQty && fieldNames.find((n) => n === envQty)) ||
      pickColumn(fieldNames, ['order lines/quantity', 'quantity', 'qty', '\u0e08\u0e33\u0e19\u0e27\u0e19', '\u0e22\u0e2d\u0e14\u0e02\u0e32\u0e22\u0e08\u0e33\u0e19\u0e27\u0e19']),
    channel: pickColumn(fieldNames, ['\u0e0a\u0e48\u0e2d\u0e07\u0e17\u0e32\u0e07', 'channel', 'customer_type', 'type']),
    customer: pickColumn(fieldNames, ['customer', 'display_name', 'order_partner', '\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32']),
    category: pickColumn(fieldNames, ['\u0e2b\u0e21\u0e27\u0e14\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32', 'category', 'product_category']),
    order: pickColumn(fieldNames, ['order_name', 'order', 'name'])
  };
}

async function canUseCustomerTypeMap(client: PoolClient) {
  const result = await client.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l4k_model' AND table_name = 'customer_type' AND column_name = 'Title'
      ) AS has_title,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'l4k_model' AND table_name = 'customer_type' AND column_name = 'type'
      ) AS has_type
  `);
  return Boolean(result.rows[0]?.has_title) && Boolean(result.rows[0]?.has_type);
}

function buildVsScopedQuery(
  stage: VsStageFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean,
  includeDimensionFilters: boolean
) {
  const params: Array<string | string[]> = [stage.dateStart, stage.dateEnd];
  const dateExpr = `j.${quoteIdent(columns.date)}`;
  const orderExpr = columns.order
    ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.order)} AS TEXT)), ''), j.ctid::text)`
    : 'j.ctid::text';
  const revenueExpr = columns.revenue
    ? `COALESCE(CAST(j.${quoteIdent(columns.revenue)} AS numeric), 0)`
    : '0::numeric';
  const qtyExpr = columns.quantity
    ? `COALESCE(CAST(j.${quoteIdent(columns.quantity)} AS numeric), 0)`
    : '0::numeric';
  const categoryExpr = columns.category
    ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.category)} AS TEXT)), ''), 'Unknown')`
    : `'Unknown'`;
  const customerExpr = columns.customer
    ? `NULLIF(TRIM(CAST(j.${quoteIdent(columns.customer)} AS TEXT)), '')`
    : 'NULL';
  const statusExpr = columns.status
    ? `CASE
      WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('complete', 'completed', 'saled', 'fulfilled') THEN 'Complete'
      WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('cancel', 'cancelled', 'canceled') THEN 'Cancel'
      ELSE 'Unknown'
    END`
    : `'Unknown'`;
  const joinCustomerType =
    useCustomerTypeMap && columns.customer
      ? `LEFT JOIN (
          SELECT
            TRIM(CAST("Title" AS TEXT)) AS title_key,
            MIN(CAST("type" AS TEXT)) AS mapped_type
          FROM l4k_model.customer_type
          GROUP BY TRIM(CAST("Title" AS TEXT))
        ) ct ON ${customerExpr} = ct.title_key`
      : '';
  const channelExpr =
    useCustomerTypeMap && columns.customer
      ? `COALESCE(NULLIF(TRIM(ct.mapped_type), ''), 'Unknown')`
      : `'Unknown'`;

  const whereParts = [`${dateExpr}::date BETWEEN $1 AND $2`];
  const normalizedStatuses = normalizeVsStatuses(stage.statuses ?? []);
  if (normalizedStatuses.length > 0) {
    params.push(normalizedStatuses);
    whereParts.push(`${statusExpr} = ANY($${params.length}::text[])`);
  }

  const filteredParts = ['1=1'];
  if (includeDimensionFilters) {
    const channels = toUniqueStrings(stage.channels ?? []).map((v) => v.toLowerCase());
    const categories = toUniqueStrings(stage.categories ?? []).map((v) => v.toLowerCase());

    if (channels.length > 0) {
      params.push(channels);
      filteredParts.push(`LOWER(channel) = ANY($${params.length}::text[])`);
    }
    if (categories.length > 0) {
      params.push(categories);
      filteredParts.push(`LOWER(category) = ANY($${params.length}::text[])`);
    }
  }

  const cteSql = `
    WITH scoped AS (
      SELECT
        ${orderExpr} AS order_key,
        ${revenueExpr} AS revenue,
        ${qtyExpr} AS quantity,
        ${categoryExpr} AS category,
        ${channelExpr} AS channel,
        ${statusExpr} AS normalized_status
      FROM l4k_model.joinsales_orderline j
      ${joinCustomerType}
      WHERE ${whereParts.join(' AND ')}
    ),
    filtered AS (
      SELECT * FROM scoped
      WHERE ${filteredParts.join(' AND ')}
    )
  `;

  return { cteSql, params };
}

async function getVsOptions(
  client: PoolClient,
  stage: VsStageFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean
) {
  const baseStage = { ...stage, channels: [], categories: [] };
  const { cteSql, params } = buildVsScopedQuery(
    baseStage,
    columns,
    useCustomerTypeMap,
    false
  );
  const [channelsResult, categoriesResult] = await Promise.all([
    client.query(`${cteSql} SELECT DISTINCT channel FROM filtered ORDER BY channel`, params),
    client.query(`${cteSql} SELECT DISTINCT category FROM filtered ORDER BY category`, params)
  ]);

  return {
    channels: channelsResult.rows.map((r) => String(r.channel ?? 'Unknown')),
    categories: categoriesResult.rows.map((r) => String(r.category ?? 'Unknown'))
  };
}

async function getVsStageMetrics(
  client: PoolClient,
  stage: VsStageFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean
) {
  const { cteSql, params } = buildVsScopedQuery(stage, columns, useCustomerTypeMap, true);
  const [summaryResult, channelsResult, categoriesResult] = await Promise.all([
    client.query(
      `${cteSql}
       SELECT
         COUNT(DISTINCT order_key)::bigint AS total_orders,
         COALESCE(SUM(revenue), 0)::numeric AS total_revenue,
         COALESCE(SUM(quantity), 0)::numeric AS total_quantity
       FROM filtered`,
      params
    ),
    client.query(
      `${cteSql}
       SELECT
         channel AS key,
         COUNT(DISTINCT order_key)::bigint AS orders,
         COALESCE(SUM(revenue), 0)::numeric AS revenue,
         COALESCE(SUM(quantity), 0)::numeric AS quantity
       FROM filtered
       GROUP BY channel
       ORDER BY revenue DESC, channel ASC
       LIMIT 10`,
      params
    ),
    client.query(
      `${cteSql}
       SELECT
         category AS key,
         COUNT(DISTINCT order_key)::bigint AS orders,
         COALESCE(SUM(revenue), 0)::numeric AS revenue,
         COALESCE(SUM(quantity), 0)::numeric AS quantity
       FROM filtered
       GROUP BY category
       ORDER BY revenue DESC, category ASC
       LIMIT 10`,
      params
    )
  ]);

  const summary = summaryResult.rows[0] ?? {};
  return {
    kpi: {
      totalOrders: Number(summary.total_orders ?? 0),
      totalRevenue: Number(summary.total_revenue ?? 0),
      totalQuantity: Number(summary.total_quantity ?? 0)
    },
    topChannels: channelsResult.rows.map((row) => ({
      key: String(row.key ?? 'Unknown'),
      orders: Number(row.orders ?? 0),
      revenue: Number(row.revenue ?? 0),
      quantity: Number(row.quantity ?? 0)
    })),
    topCategories: categoriesResult.rows.map((row) => ({
      key: String(row.key ?? 'Unknown'),
      orders: Number(row.orders ?? 0),
      revenue: Number(row.revenue ?? 0),
      quantity: Number(row.quantity ?? 0)
    }))
  };
}

function percentDelta(current: number, baseline: number) {
  if (baseline === 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function normalizeSalesTargetChannelValue(value: string) {
  const trimmed = value.trim();
  if (trimmed.toLowerCase() === '\u0e02\u0e32\u0e22\u0e02\u0e32\u0e14') {
    return '\u0e15\u0e31\u0e27\u0e41\u0e17\u0e19\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e14';
  }
  return trimmed;
}

function salesTargetChannelSql(expr: string) {
  return `CASE
    WHEN LOWER(${expr}) = LOWER('\u0e02\u0e32\u0e22\u0e02\u0e32\u0e14') THEN '\u0e15\u0e31\u0e27\u0e41\u0e17\u0e19\u0e0b\u0e37\u0e49\u0e2d\u0e02\u0e32\u0e14'
    ELSE ${expr}
  END`;
}

function buildSalesTargetActualScopedQuery(
  filter: SalesTargetFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean,
  includeDimensionFilters: boolean
) {
  const params: Array<string | string[]> = [filter.dateStart, filter.dateEnd];
  const dateExpr = `j.${quoteIdent(columns.date)}`;
  const revenueExpr = columns.revenue
    ? `COALESCE(CAST(j.${quoteIdent(columns.revenue)} AS numeric), 0)`
    : '0::numeric';
  const statusExpr = columns.status
    ? `CASE
      WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('complete', 'completed', 'saled', 'fulfilled') THEN 'Complete'
      WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('cancel', 'cancelled', 'canceled') THEN 'Cancel'
      ELSE 'Unknown'
    END`
    : `'Unknown'`;
  const categoryExpr = columns.category
    ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.category)} AS TEXT)), ''), 'Unknown')`
    : `'Unknown'`;
  const customerExpr = columns.customer
    ? `NULLIF(TRIM(CAST(j.${quoteIdent(columns.customer)} AS TEXT)), '')`
    : 'NULL';
  const joinCustomerType =
    !columns.channel && useCustomerTypeMap && columns.customer
      ? `LEFT JOIN (
          SELECT
            TRIM(CAST("Title" AS TEXT)) AS title_key,
            MIN(CAST("type" AS TEXT)) AS mapped_type
          FROM l4k_model.customer_type
          GROUP BY TRIM(CAST("Title" AS TEXT))
        ) ct ON ${customerExpr} = ct.title_key`
      : '';
  const rawChannelExpr = columns.channel
    ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.channel)} AS TEXT)), ''), 'Unknown')`
    : !columns.channel && useCustomerTypeMap && columns.customer
      ? `COALESCE(NULLIF(TRIM(ct.mapped_type), ''), 'Unknown')`
      : `'Unknown'`;
  const channelExpr = salesTargetChannelSql(rawChannelExpr);

  const whereParts = [`${dateExpr}::date BETWEEN $1 AND $2`];
  const normalizedStatuses = normalizeVsStatuses(filter.statuses ?? []);
  if (normalizedStatuses.length > 0) {
    params.push(normalizedStatuses);
    whereParts.push(`${statusExpr} = ANY($${params.length}::text[])`);
  }

  const filteredParts = ['1=1'];
  if (includeDimensionFilters) {
    const channels = toUniqueStrings(filter.channels ?? [])
      .map((v) => normalizeSalesTargetChannelValue(v).toLowerCase());
    const categories = toUniqueStrings(filter.categories ?? []).map((v) => v.toLowerCase());
    if (channels.length > 0) {
      params.push(channels);
      filteredParts.push(`LOWER(channel) = ANY($${params.length}::text[])`);
    }
    if (categories.length > 0) {
      params.push(categories);
      filteredParts.push(`LOWER(category) = ANY($${params.length}::text[])`);
    }
  }

  const cteSql = `
    WITH actual_scoped AS (
      SELECT
        date_trunc('month', ${dateExpr}::date)::date AS month_key,
        ${channelExpr} AS channel,
        ${categoryExpr} AS category,
        ${revenueExpr} AS revenue
      FROM l4k_model.joinsales_orderline j
      ${joinCustomerType}
      WHERE ${whereParts.join(' AND ')}
    ),
    actual_filtered AS (
      SELECT * FROM actual_scoped
      WHERE ${filteredParts.join(' AND ')}
    )
  `;

  return { cteSql, params };
}

function buildSalesTargetTargetScopedQuery(
  filter: SalesTargetFilter,
  includeDimensionFilters: boolean
) {
  const params: Array<string | string[]> = [filter.dateStart, filter.dateEnd];
  const monthExpr = `date_trunc('month', ((t.target_month + interval '7 hour')::date))::date`;
  const rawChannelExpr = `COALESCE(NULLIF(TRIM(CAST(t.channel AS TEXT)), ''), 'Unknown')`;
  const channelExpr = salesTargetChannelSql(rawChannelExpr);
  const categoryExpr = `COALESCE(NULLIF(TRIM(CAST(t.category AS TEXT)), ''), 'Unknown')`;

  const whereParts = [
    `${monthExpr} BETWEEN date_trunc('month', $1::date)::date AND date_trunc('month', $2::date)::date`
  ];
  const filteredParts = ['1=1'];

  if (includeDimensionFilters) {
    const channels = toUniqueStrings(filter.channels ?? [])
      .map((v) => normalizeSalesTargetChannelValue(v).toLowerCase());
    const categories = toUniqueStrings(filter.categories ?? []).map((v) => v.toLowerCase());
    if (channels.length > 0) {
      params.push(channels);
      filteredParts.push(`LOWER(channel) = ANY($${params.length}::text[])`);
    }
    if (categories.length > 0) {
      params.push(categories);
      filteredParts.push(`LOWER(category) = ANY($${params.length}::text[])`);
    }
  }

  const cteSql = `
    WITH target_scoped AS (
      SELECT
        ${monthExpr} AS month_key,
        ${channelExpr} AS channel,
        ${categoryExpr} AS category,
        COALESCE(CAST(t.target AS numeric), 0) AS target_revenue
      FROM l4k_model.product_sales_target t
      WHERE ${whereParts.join(' AND ')}
    ),
    target_filtered AS (
      SELECT * FROM target_scoped
      WHERE ${filteredParts.join(' AND ')}
    )
  `;

  return { cteSql, params };
}

function toIsoDateKey(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
}

function mergeRevenueBreakdown(
  actualRows: Array<{ key: string; actual_revenue: number }>,
  targetRows: Array<{ key: string; target_revenue: number }>
) {
  const actualMap = new Map<string, number>(
    actualRows.map((row) => [String(row.key ?? 'Unknown'), Number(row.actual_revenue ?? 0)])
  );
  const targetMap = new Map<string, number>(
    targetRows.map((row) => [String(row.key ?? 'Unknown'), Number(row.target_revenue ?? 0)])
  );
  const keys = new Set<string>([...actualMap.keys(), ...targetMap.keys()]);
  const rows = Array.from(keys).map((key) => {
    const actualRevenue = actualMap.get(key) ?? 0;
    const targetRevenue = targetMap.get(key) ?? 0;
    const gapRevenue = actualRevenue - targetRevenue;
    return {
      key,
      actualRevenue,
      targetRevenue,
      gapRevenue,
      achievementPct: targetRevenue === 0 ? null : (actualRevenue / targetRevenue) * 100
    };
  });
  rows.sort((a, b) =>
    Math.abs(b.gapRevenue) - Math.abs(a.gapRevenue) || a.key.localeCompare(b.key, 'th')
  );
  return rows;
}

async function getSalesTargetOptions(
  client: PoolClient,
  filter: SalesTargetFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean
) {
  const baseFilter = { ...filter, channels: [], categories: [] };
  const { cteSql: actualSql, params: actualParams } = buildSalesTargetActualScopedQuery(
    baseFilter,
    columns,
    useCustomerTypeMap,
    false
  );
  const { cteSql: targetSql, params: targetParams } = buildSalesTargetTargetScopedQuery(
    baseFilter,
    false
  );

  const [actualChannels, actualCategories, targetChannels, targetCategories] = await Promise.all([
    client.query(`${actualSql} SELECT DISTINCT channel FROM actual_filtered ORDER BY channel`, actualParams),
    client.query(`${actualSql} SELECT DISTINCT category FROM actual_filtered ORDER BY category`, actualParams),
    client.query(`${targetSql} SELECT DISTINCT channel FROM target_filtered ORDER BY channel`, targetParams),
    client.query(`${targetSql} SELECT DISTINCT category FROM target_filtered ORDER BY category`, targetParams)
  ]);

  const channelSet = new Set<string>();
  const categorySet = new Set<string>();
  for (const row of [...actualChannels.rows, ...targetChannels.rows]) {
    channelSet.add(String(row.channel ?? 'Unknown'));
  }
  for (const row of [...actualCategories.rows, ...targetCategories.rows]) {
    categorySet.add(String(row.category ?? 'Unknown'));
  }

  return {
    channels: Array.from(channelSet).sort((a, b) => a.localeCompare(b, 'th')),
    categories: Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'th'))
  };
}

async function getSalesTargetCompare(
  client: PoolClient,
  filter: SalesTargetFilter,
  columns: VsColumns,
  useCustomerTypeMap: boolean
) {
  const { cteSql: actualSql, params: actualParams } = buildSalesTargetActualScopedQuery(
    filter,
    columns,
    useCustomerTypeMap,
    true
  );
  const { cteSql: targetSql, params: targetParams } = buildSalesTargetTargetScopedQuery(
    filter,
    true
  );

  const [
    monthSeriesResult,
    actualSummaryResult,
    actualMonthlyResult,
    actualByChannelResult,
    actualByCategoryResult,
    targetSummaryResult,
    targetMonthlyResult,
    targetByChannelResult,
    targetByCategoryResult
  ] = await Promise.all([
    client.query(
      `SELECT generate_series(
          date_trunc('month', $1::date)::date,
          date_trunc('month', $2::date)::date,
          interval '1 month'
        )::date AS month_key`,
      [filter.dateStart, filter.dateEnd]
    ),
    client.query(
      `${actualSql}
       SELECT COALESCE(SUM(revenue), 0)::numeric AS actual_revenue
       FROM actual_filtered`,
      actualParams
    ),
    client.query(
      `${actualSql}
       SELECT month_key, COALESCE(SUM(revenue), 0)::numeric AS actual_revenue
       FROM actual_filtered
       GROUP BY month_key
       ORDER BY month_key`,
      actualParams
    ),
    client.query(
      `${actualSql}
       SELECT channel AS key, COALESCE(SUM(revenue), 0)::numeric AS actual_revenue
       FROM actual_filtered
       GROUP BY channel`,
      actualParams
    ),
    client.query(
      `${actualSql}
       SELECT category AS key, COALESCE(SUM(revenue), 0)::numeric AS actual_revenue
       FROM actual_filtered
       GROUP BY category`,
      actualParams
    ),
    client.query(
      `${targetSql}
       SELECT COALESCE(SUM(target_revenue), 0)::numeric AS target_revenue
       FROM target_filtered`,
      targetParams
    ),
    client.query(
      `${targetSql}
       SELECT month_key, COALESCE(SUM(target_revenue), 0)::numeric AS target_revenue
       FROM target_filtered
       GROUP BY month_key
       ORDER BY month_key`,
      targetParams
    ),
    client.query(
      `${targetSql}
       SELECT channel AS key, COALESCE(SUM(target_revenue), 0)::numeric AS target_revenue
       FROM target_filtered
       GROUP BY channel`,
      targetParams
    ),
    client.query(
      `${targetSql}
       SELECT category AS key, COALESCE(SUM(target_revenue), 0)::numeric AS target_revenue
       FROM target_filtered
       GROUP BY category`,
      targetParams
    )
  ]);

  const actualRevenue = Number(actualSummaryResult.rows[0]?.actual_revenue ?? 0);
  const targetRevenue = Number(targetSummaryResult.rows[0]?.target_revenue ?? 0);
  const gapRevenue = actualRevenue - targetRevenue;
  const achievementPct = targetRevenue === 0 ? null : (actualRevenue / targetRevenue) * 100;

  const actualMonthlyMap = new Map<string, number>(
    actualMonthlyResult.rows.map((row) => [toIsoDateKey(row.month_key), Number(row.actual_revenue ?? 0)])
  );
  const targetMonthlyMap = new Map<string, number>(
    targetMonthlyResult.rows.map((row) => [toIsoDateKey(row.month_key), Number(row.target_revenue ?? 0)])
  );

  const chart = monthSeriesResult.rows.map((row) => {
    const monthKey = toIsoDateKey(row.month_key);
    const actual = actualMonthlyMap.get(monthKey) ?? 0;
    const target = targetMonthlyMap.get(monthKey) ?? 0;
    const gap = actual - target;
    return {
      month: monthKey.slice(0, 7),
      actualRevenue: actual,
      targetRevenue: target,
      gapRevenue: gap,
      achievementPct: target === 0 ? null : (actual / target) * 100
    };
  });

  return {
    kpi: {
      actualRevenue,
      targetRevenue,
      gapRevenue,
      achievementPct
    },
    chart,
    breakdownByChannel: mergeRevenueBreakdown(
      actualByChannelResult.rows as Array<{ key: string; actual_revenue: number }>,
      targetByChannelResult.rows as Array<{ key: string; target_revenue: number }>
    ),
    breakdownByCategory: mergeRevenueBreakdown(
      actualByCategoryResult.rows as Array<{ key: string; actual_revenue: number }>,
      targetByCategoryResult.rows as Array<{ key: string; target_revenue: number }>
    )
  };
}

// Raw rows preview from PostgreSQL table for Sale Order Analysis
// GET /api/analytics/orders/raw?page=1&pageSize=50
router.get('/orders/raw', async (req, res, next) => {
  try {
    const querySchema = z
      .object({
        page: z
          .string()
          .optional()
          .transform((v) => (v ? Number(v) : 1)),
        pageSize: z
          .string()
          .optional()
          .transform((v) => (v ? Number(v) : 50)),
        dateStart: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateStart'),
        dateEnd: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateEnd'),
        status: z.string().optional(),
        q: z.string().optional()
      })
      .parse(req.query);

    const page = Math.max(querySchema.page ?? 1, 1);
    const maxPageSize = (() => {
      const v = Number(process.env.RAW_MAX_PAGE_SIZE ?? '1000');
      return Number.isFinite(v) && v > 0 ? Math.floor(v) : 1000;
    })();
    const pageSize = Math.min(Math.max(querySchema.pageSize ?? 50, 1), maxPageSize);
    const offset = (page - 1) * pageSize;

    const client = await getPool().connect();
    try {
      // Determine/quote date column safely; auto-detect if not provided
      const sample = await client.query(
        'SELECT * FROM l4k_model.joinsales_orderline LIMIT 0'
      );
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const envName = process.env.RAW_DATE_COLUMN;
      let chosen = envName && envName.trim().length > 0 ? envName : '';
      if (!chosen) {
        const exact = fieldNames.find((n) => normalize(n) === 'orderdate');
        chosen = exact ?? fieldNames.find((n) => normalize(n).includes('date')) ?? 'order_date';
      }
      const dateColumn = '"' + chosen.replace(/"/g, '""') + '"';
      // Optionally detect status column if a status filter is provided
      let statusColumn: string | null = null;
      if (querySchema.status) {
        const normalize2 = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
        const envStatus = process.env.RAW_STATUS_COLUMN;
        const statusCandidates = ['status', 'orderstatus', 'itemstatus', 'saled', 'sale_status', 'สถานะ'];
        let chosenStatus = envStatus && envStatus.trim().length > 0 ? envStatus : '';
        if (!chosenStatus) {
          const match = fieldNames.find((n) => {
            const key = normalize2(n);
            return statusCandidates.some((c) => key === c || key.includes(c));
          });
          chosenStatus = match ?? 'status';
        }
        statusColumn = '"' + chosenStatus.replace(/"/g, '""') + '"';
      }

      const parts: string[] = [];
      const params: Array<string | number> = [];
      if (querySchema.dateStart && querySchema.dateEnd) {
        parts.push(`(${dateColumn}::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
        params.push(querySchema.dateStart, querySchema.dateEnd);
      }
      if (statusColumn && querySchema.status) {
        parts.push(`${statusColumn} = $${params.length + 1}`);
        params.push(querySchema.status);
      }
      // Optional keyword search across common text-like columns
      const rawQ = querySchema.q?.trim();
      if (rawQ && rawQ.length > 0) {
        const q = `%${rawQ}%`;
        const preferred = [
          'order_name',
          'customer',
          'status',
          'product_name',
          'description',
          'sku',
          'รหัส',
          'หมวดสินค้า',
          'สถานะ',
          'ลูกค้า'
        ];
        const namesSet = new Set(fieldNames);
        const chosen: string[] = [];
        for (const p of preferred) if (namesSet.has(p)) chosen.push(p);
        for (const n of fieldNames) {
          if (chosen.length >= 6) break;
          if (!chosen.includes(n)) chosen.push(n);
        }
        if (chosen.length > 0) {
          const orParts: string[] = [];
          for (const col of chosen.slice(0, 8)) {
            const qcol = '"' + col.replace(/"/g, '""') + '"';
            orParts.push(`CAST(${qcol} AS TEXT) ILIKE $${params.length + 1}`);
            params.push(q);
          }
          parts.push(`(${orParts.join(' OR ')})`);
        }
      }
      const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
      const countParams = [...params];
      const dataParams: Array<string | number> = [...params, offset, pageSize];

      const countSql = `SELECT COUNT(*)::bigint AS cnt FROM l4k_model.joinsales_orderline ${where}`;
      const dataSql = `SELECT * FROM l4k_model.joinsales_orderline ${where} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;

      const countResult = await client.query(countSql, countParams);
      const totalRecords = Number(countResult.rows[0]?.cnt ?? 0);
      const result = await client.query(dataSql, dataParams);

      const columns = (result.fields as FieldDef[]).map((f) => f.name);
      res.json({
        data: {
          columns,
          rows: result.rows,
          page,
          pageSize,
          totalRecords,
          totalPages: Math.max(Math.ceil(totalRecords / pageSize), 1)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Aggregated summary (count + optional sums) for the same table/filters
router.get('/orders/raw/summary', async (req, res, next) => {
  try {
    const querySchema = z
      .object({
        dateStart: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateStart'),
        dateEnd: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateEnd'),
        status: z.string().optional()
      })
      .parse(req.query);

    const client = await getPool().connect();
    try {
      const sample = await client.query(
        'SELECT * FROM l4k_model.joinsales_orderline LIMIT 0'
      );
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');
      const normalizeStatus = normalize;

      const envDate = process.env.RAW_DATE_COLUMN;
      let chosenDate = envDate && envDate.trim().length > 0 ? envDate : '';
      if (!chosenDate) {
        const exact = fieldNames.find((n) => normalize(n) === 'orderdate');
        chosenDate = exact ?? fieldNames.find((n) => normalize(n).includes('date')) ?? 'order_date';
      }
      const dateColumn = `"${chosenDate.replace(/"/g, '""')}"`;

      const envRev = process.env.RAW_REVENUE_COLUMN;
      const revCandidates = ['revenue', 'amount', 'price', 'totalprice', 'รวมราคา'];
      let chosenRev = envRev && envRev.trim().length > 0 ? envRev : '';
      if (!chosenRev) {
        const matches = fieldNames.find((n) => {
          const key = normalize(n);
          return revCandidates.some((c) => key === c || key.includes(c));
        });
        chosenRev = matches ?? '';
      }

      const envQty = process.env.RAW_QUANTITY_COLUMN;
      const qtyCandidates = ['quantity', 'qty', 'lineqty', 'orderqty', 'จำนวน'];
      let chosenQty = envQty && envQty.trim().length > 0 ? envQty : '';
      if (!chosenQty) {
        const matchQty = fieldNames.find((n) => {
          const key = normalize(n);
          return qtyCandidates.some((c) => key === c || key.includes(c));
        });
        chosenQty = matchQty ?? '';
      }

      // Detect status column for optional status filtering
      const envStatus = process.env.RAW_STATUS_COLUMN;
      const statusCandidates = ['status', 'orderstatus', 'itemstatus', 'saled', 'sale_status', 'สถานะ'];
      let chosenStatus = envStatus && envStatus.trim().length > 0 ? envStatus : '';
      if (!chosenStatus) {
        const match = fieldNames.find((n) => {
          const key = normalizeStatus(n);
          return statusCandidates.some((c) => key === c || key.includes(c));
        });
        chosenStatus = match ?? 'status';
      }
      const statusColumn = `"${chosenStatus.replace(/"/g, '""')}"`;

      const filters: string[] = [];
      const params: Array<string | number> = [];
      if (querySchema.dateStart && querySchema.dateEnd) {
        filters.push(`(${dateColumn}::date BETWEEN $${params.length + 1} AND $${params.length + 2})`);
        params.push(querySchema.dateStart as string, querySchema.dateEnd as string);
      }
      if (querySchema.status) {
        filters.push(`${statusColumn} = $${params.length + 1}`);
        params.push(querySchema.status);
      }

      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const selectParts = ['COUNT(*)::bigint AS cnt'];
      if (chosenRev) selectParts.push(`SUM("${chosenRev.replace(/"/g, '""')}")::numeric AS revenue`);
      if (chosenQty) selectParts.push(`SUM("${chosenQty.replace(/"/g, '""')}")::numeric AS quantity`);

      const sql = `SELECT ${selectParts.join(', ')} FROM l4k_model.joinsales_orderline ${where}`;
      const result = await client.query(sql, params);
      const row = result.rows[0] ?? {};
      res.json({
        data: {
          totalRecords: Number(row.cnt ?? 0),
          totalRevenue: row.revenue !== undefined ? Number(row.revenue) : undefined,
          totalQuantity: row.quantity !== undefined ? Number(row.quantity) : undefined
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Status breakdown for pie chart (e.g., Saled vs Cancel)
router.get('/orders/raw/status', async (req, res, next) => {
  try {
    const querySchema = z
      .object({
        dateStart: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateStart'),
        dateEnd: z
          .string()
          .optional()
          .refine((v) => (v ? !Number.isNaN(Date.parse(v)) : true), 'Invalid dateEnd')
      })
      .parse(req.query);

    const client = await getPool().connect();
    try {
      const sample = await client.query(
        'SELECT * FROM l4k_model.joinsales_orderline LIMIT 0'
      );
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u0E00-\u0E7F]/g, '');

      // Date col for filter (reuse detection logic)
      const envDate = process.env.RAW_DATE_COLUMN;
      let chosenDate = envDate && envDate.trim().length > 0 ? envDate : '';
      if (!chosenDate) {
        const exact = fieldNames.find((n) => normalize(n) === 'orderdate');
        chosenDate = exact ?? fieldNames.find((n) => normalize(n).includes('date')) ?? 'order_date';
      }
      const dateColumn = `"${chosenDate.replace(/"/g, '""')}"`;

      // Status column detection
      const envStatus = process.env.RAW_STATUS_COLUMN;
      const statusCandidates = ['status', 'orderstatus', 'itemstatus', 'saled', 'sale_status', 'สถานะ'];
      let chosenStatus = envStatus && envStatus.trim().length > 0 ? envStatus : '';
      if (!chosenStatus) {
        const match = fieldNames.find((n) => {
          const key = normalize(n);
          return statusCandidates.some((c) => key === c || key.includes(c));
        });
        chosenStatus = match ?? 'status';
      }
      const statusColumn = `"${chosenStatus.replace(/"/g, '""')}"`;

      const hasDateFilter = querySchema.dateStart && querySchema.dateEnd;
      const where = hasDateFilter ? `WHERE (${dateColumn}::date BETWEEN $1 AND $2)` : '';
      const params: Array<string | number> = hasDateFilter
        ? [querySchema.dateStart as string, querySchema.dateEnd as string]
        : [];

      const sql = `SELECT ${statusColumn} AS status, COUNT(*)::bigint AS cnt FROM l4k_model.joinsales_orderline ${where} GROUP BY 1`;
      const result = await client.query(sql, params);
      const rows = result.rows.map((r) => ({ status: String(r.status ?? ''), count: Number(r.cnt ?? 0) }));
      const total = rows.reduce((acc, r) => acc + r.count, 0);
      res.json({ data: { total, rows } });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/orders/vs/options', async (req, res, next) => {
  try {
    const stage = vsStageFilterSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCustomerTypeMap = await canUseCustomerTypeMap(client);
      const data = await getVsOptions(client, stage, columns, useCustomerTypeMap);
      res.json({ data });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/orders/vs/compare', async (req, res, next) => {
  try {
    const payload = vsCompareSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCustomerTypeMap = await canUseCustomerTypeMap(client);

      const [stageA, stageB] = await Promise.all([
        getVsStageMetrics(client, payload.stageA, columns, useCustomerTypeMap),
        getVsStageMetrics(client, payload.stageB, columns, useCustomerTypeMap)
      ]);

      const chart = [
        {
          metric: 'Orders',
          stageA: stageA.kpi.totalOrders,
          stageB: stageB.kpi.totalOrders
        },
        {
          metric: 'Revenue',
          stageA: stageA.kpi.totalRevenue,
          stageB: stageB.kpi.totalRevenue
        },
        {
          metric: 'Qty',
          stageA: stageA.kpi.totalQuantity,
          stageB: stageB.kpi.totalQuantity
        }
      ];

      const delta = {
        orders: {
          absolute: stageA.kpi.totalOrders - stageB.kpi.totalOrders,
          percent: percentDelta(stageA.kpi.totalOrders, stageB.kpi.totalOrders)
        },
        revenue: {
          absolute: stageA.kpi.totalRevenue - stageB.kpi.totalRevenue,
          percent: percentDelta(stageA.kpi.totalRevenue, stageB.kpi.totalRevenue)
        },
        quantity: {
          absolute: stageA.kpi.totalQuantity - stageB.kpi.totalQuantity,
          percent: percentDelta(stageA.kpi.totalQuantity, stageB.kpi.totalQuantity)
        }
      };

      res.json({
        data: {
          stageA,
          stageB,
          delta,
          chart
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/orders/target/options', async (req, res, next) => {
  try {
    const filter = salesTargetFilterSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCustomerTypeMap = await canUseCustomerTypeMap(client);
      const data = await getSalesTargetOptions(client, filter, columns, useCustomerTypeMap);
      res.json({ data });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

router.post('/orders/target/compare', async (req, res, next) => {
  try {
    const filter = salesTargetFilterSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCustomerTypeMap = await canUseCustomerTypeMap(client);
      const data = await getSalesTargetCompare(client, filter, columns, useCustomerTypeMap);
      res.json({ data });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Target pivot: actual current year vs target vs actual previous year, monthly by channel>category
const targetPivotSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  statuses: z.array(z.string()).optional().default([]),
  channels: z.array(z.string()).optional().default([]),
  categories: z.array(z.string()).optional().default([])
});

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

router.post('/orders/target/pivot', async (req, res, next) => {
  try {
    const { year, statuses, channels, categories } = targetPivotSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCustomerTypeMap = await canUseCustomerTypeMap(client);

      const currentYearStart = `${year}-01-01`;
      const currentYearEnd = `${year}-12-31`;
      const prevYearStart = `${year - 1}-01-01`;
      const prevYearEnd = `${year - 1}-12-31`;

      const filterBase = { statuses, channels, categories };

      // Build queries using existing helpers
      const { cteSql: targetSql, params: targetParams } = buildSalesTargetTargetScopedQuery(
        { dateStart: currentYearStart, dateEnd: currentYearEnd, ...filterBase },
        true
      );
      const { cteSql: actualCurSql, params: actualCurParams } = buildSalesTargetActualScopedQuery(
        { dateStart: currentYearStart, dateEnd: currentYearEnd, ...filterBase },
        columns, useCustomerTypeMap, true
      );
      const { cteSql: actualPrevSql, params: actualPrevParams } = buildSalesTargetActualScopedQuery(
        { dateStart: prevYearStart, dateEnd: prevYearEnd, ...filterBase },
        columns, useCustomerTypeMap, true
      );

      const [targetResult, actualCurResult, actualPrevResult] = await Promise.all([
        client.query(
          `${targetSql}
           SELECT EXTRACT(MONTH FROM month_key)::int AS m, channel, category,
                  COALESCE(SUM(target_revenue), 0)::numeric AS val
           FROM target_filtered
           GROUP BY 1, 2, 3
           ORDER BY 1, 2, 3`,
          targetParams
        ),
        client.query(
          `${actualCurSql}
           SELECT EXTRACT(MONTH FROM month_key)::int AS m, channel, category,
                  COALESCE(SUM(revenue), 0)::numeric AS val
           FROM actual_filtered
           GROUP BY 1, 2, 3
           ORDER BY 1, 2, 3`,
          actualCurParams
        ),
        client.query(
          `${actualPrevSql}
           SELECT EXTRACT(MONTH FROM month_key)::int AS m, channel, category,
                  COALESCE(SUM(revenue), 0)::numeric AS val
           FROM actual_filtered
           GROUP BY 1, 2, 3
           ORDER BY 1, 2, 3`,
          actualPrevParams
        )
      ]);

      // Merge all into maps
      type DataKey = string; // "month|channel|category"
      const targetMap = new Map<DataKey, number>();
      const actualCurMap = new Map<DataKey, number>();
      const actualPrevMap = new Map<DataKey, number>();
      const channelSet = new Set<string>();
      const categorySet = new Set<string>();

      for (const row of targetResult.rows) {
        const ch = String(row.channel ?? 'Unknown');
        const cat = String(row.category ?? 'Unknown');
        channelSet.add(ch); categorySet.add(cat);
        targetMap.set(`${row.m}|${ch}|${cat}`, Number(row.val ?? 0));
      }
      for (const row of actualCurResult.rows) {
        const ch = String(row.channel ?? 'Unknown');
        const cat = String(row.category ?? 'Unknown');
        channelSet.add(ch); categorySet.add(cat);
        actualCurMap.set(`${row.m}|${ch}|${cat}`, Number(row.val ?? 0));
      }
      for (const row of actualPrevResult.rows) {
        const ch = String(row.channel ?? 'Unknown');
        const cat = String(row.category ?? 'Unknown');
        channelSet.add(ch); categorySet.add(cat);
        actualPrevMap.set(`${row.m}|${ch}|${cat}`, Number(row.val ?? 0));
      }

      // Build column headers: channel > category (only combos with data)
      const channelsSorted = Array.from(channelSet).sort((a, b) => a.localeCompare(b, 'th'));
      const categoriesSorted = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'th'));
      const columnHeaders: Array<{ channel: string; category: string }> = [];
      for (const ch of channelsSorted) {
        for (const cat of categoriesSorted) {
          const hasData = Array.from({ length: 12 }, (_, i) => i + 1).some(
            (m) => targetMap.has(`${m}|${ch}|${cat}`) ||
                   actualCurMap.has(`${m}|${ch}|${cat}`) ||
                   actualPrevMap.has(`${m}|${ch}|${cat}`)
          );
          if (hasData) columnHeaders.push({ channel: ch, category: cat });
        }
      }

      // Build 12 month rows
      const months = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const cells = columnHeaders.map((col) => {
          const key = `${m}|${col.channel}|${col.category}`;
          return {
            target: targetMap.get(key) ?? 0,
            actualCurrent: actualCurMap.get(key) ?? 0,
            actualPrevious: actualPrevMap.get(key) ?? 0
          };
        });
        return { monthIndex: m, label: THAI_MONTHS[i], cells };
      });

      res.json({
        data: { year, columnHeaders, months }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Pivot data: monthly breakdown by channel > category for VS comparison
const vsPivotSchema = vsStageFilterSchema.extend({
  granularity: z.enum(['daily', 'monthly', 'yearly']).optional().default('monthly')
});

router.post('/orders/vs/pivot', async (req, res, next) => {
  try {
    const { granularity, ...stage } = vsPivotSchema.parse(req.body ?? {});
    const client = await getPool().connect();
    try {
      const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
      const columns = resolveVsColumns(fieldNames);
      const useCtMap = await canUseCustomerTypeMap(client);

      const dateCol = quoteIdent(columns.date);
      const dateExpr = `j.${dateCol}`;
      const params2: Array<string | string[]> = [stage.dateStart, stage.dateEnd];

      // Time grouping expression based on granularity
      const timeExpr = granularity === 'daily'
        ? `${dateExpr}::date`
        : `EXTRACT(MONTH FROM ${dateExpr}::date)::int`;

      const pivotSql = `
        WITH scoped2 AS (
          SELECT
            ${timeExpr} AS time_key,
            ${columns.order ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.order)} AS TEXT)), ''), j.ctid::text)` : 'j.ctid::text'} AS order_key,
            ${columns.revenue ? `COALESCE(CAST(j.${quoteIdent(columns.revenue)} AS numeric), 0)` : '0::numeric'} AS revenue,
            ${columns.quantity ? `COALESCE(CAST(j.${quoteIdent(columns.quantity)} AS numeric), 0)` : '0::numeric'} AS quantity,
            ${columns.category ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(columns.category)} AS TEXT)), ''), 'Unknown')` : "'Unknown'"} AS category,
            ${useCtMap && columns.customer
              ? `COALESCE(NULLIF(TRIM(ct.mapped_type), ''), 'Unknown')`
              : "'Unknown'"} AS channel
          FROM l4k_model.joinsales_orderline j
          ${useCtMap && columns.customer
            ? `LEFT JOIN (
                SELECT TRIM(CAST("Title" AS TEXT)) AS title_key, MIN(CAST("type" AS TEXT)) AS mapped_type
                FROM l4k_model.customer_type GROUP BY TRIM(CAST("Title" AS TEXT))
              ) ct ON NULLIF(TRIM(CAST(j.${quoteIdent(columns.customer!)} AS TEXT)), '') = ct.title_key`
            : ''}
          WHERE ${dateExpr}::date BETWEEN $1 AND $2
          ${(() => {
            const normalizedStatuses = normalizeVsStatuses(stage.statuses ?? []);
            if (normalizedStatuses.length > 0) {
              const statusExpr = columns.status
                ? `CASE
                    WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('complete','completed','saled','fulfilled') THEN 'Complete'
                    WHEN LOWER(TRIM(CAST(j.${quoteIdent(columns.status)} AS TEXT))) IN ('cancel','cancelled','canceled') THEN 'Cancel'
                    ELSE 'Unknown'
                  END`
                : "'Unknown'";
              params2.push(normalizedStatuses);
              return `AND ${statusExpr} = ANY($${params2.length}::text[])`;
            }
            return '';
          })()}
        ),
        filtered2 AS (
          SELECT * FROM scoped2
          WHERE 1=1
          ${(() => {
            const channels = (stage.channels ?? []).map(v => v.trim().toLowerCase()).filter(Boolean);
            const categories = (stage.categories ?? []).map(v => v.trim().toLowerCase()).filter(Boolean);
            let extra = '';
            if (channels.length > 0) {
              params2.push(channels);
              extra += ` AND LOWER(channel) = ANY($${params2.length}::text[])`;
            }
            if (categories.length > 0) {
              params2.push(categories);
              extra += ` AND LOWER(category) = ANY($${params2.length}::text[])`;
            }
            return extra;
          })()}
        )
        SELECT
          time_key,
          channel,
          category,
          COUNT(DISTINCT order_key)::bigint AS orders,
          COALESCE(SUM(revenue), 0)::numeric AS revenue,
          COALESCE(SUM(quantity), 0)::numeric AS quantity
        FROM filtered2
        GROUP BY 1, 2, 3
        ORDER BY 1, 2, 3`;

      const result = await client.query(pivotSql, [stage.dateStart, stage.dateEnd, ...params2.slice(2)]);

      // Build structured pivot: { months, channels, data }
      const channelSet = new Set<string>();
      const categorySet = new Set<string>();
      const timeKeys = new Set<string>();
      const dataMap = new Map<string, { orders: number; revenue: number; quantity: number }>();

      for (const row of result.rows) {
        const tk = String(row.time_key);
        const ch = String(row.channel ?? 'Unknown');
        const cat = String(row.category ?? 'Unknown');
        channelSet.add(ch);
        categorySet.add(cat);
        timeKeys.add(tk);
        const key = `${tk}|${ch}|${cat}`;
        dataMap.set(key, {
          orders: Number(row.orders ?? 0),
          revenue: Number(row.revenue ?? 0),
          quantity: Number(row.quantity ?? 0)
        });
      }

      const channelsSorted = Array.from(channelSet).sort();
      const categoriesSorted = Array.from(categorySet).sort();

      // Build hierarchy: channel > category columns
      const columnHeaders: Array<{ channel: string; category: string }> = [];
      for (const ch of channelsSorted) {
        for (const cat of categoriesSorted) {
          const hasData = Array.from(timeKeys).some(
            (tk) => dataMap.has(`${tk}|${ch}|${cat}`)
          );
          if (hasData) columnHeaders.push({ channel: ch, category: cat });
        }
      }

      let months: Array<{ monthIndex: number; label: string; cells: Array<{ orders: number; revenue: number; quantity: number }> }>;

      if (granularity === 'daily') {
        // Sort dates, build rows for each date
        const sortedDates = Array.from(timeKeys).sort();
        months = sortedDates.map((dateStr, idx) => {
          // Format: "2025-03-07" -> "07/03/2025"
          const d = new Date(dateStr);
          const dd = String(d.getUTCDate()).padStart(2, '0');
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const yyyy = d.getUTCFullYear();
          const dayLabel = `${dd}/${mm}/${yyyy}`;
          const cells = columnHeaders.map((col) => {
            const v = dataMap.get(`${dateStr}|${col.channel}|${col.category}`);
            return { orders: v?.orders ?? 0, revenue: v?.revenue ?? 0, quantity: v?.quantity ?? 0 };
          });
          return { monthIndex: idx + 1, label: dayLabel, cells };
        });
      } else {
        // Monthly: fixed 12 rows
        const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        months = Array.from({ length: 12 }, (_, i) => {
          const idx = i + 1;
          const cells = columnHeaders.map((col) => {
            const d = dataMap.get(`${idx}|${col.channel}|${col.category}`);
            return { orders: d?.orders ?? 0, revenue: d?.revenue ?? 0, quantity: d?.quantity ?? 0 };
          });
          return { monthIndex: idx, label: MONTH_LABELS[i], cells };
        });
      }

      res.json({
        data: {
          columnHeaders,
          months
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Product SKU raw preview for current / previous year tables
router.get('/sku/raw', async (req, res, next) => {
  try {
    const querySchema = z
      .object({
        period: z.enum(['current', 'previous']).default('current'),
        page: z
          .string()
          .optional()
          .transform((v) => (v ? Number(v) : 1)),
        pageSize: z
          .string()
          .optional()
          .transform((v) => (v ? Number(v) : 50)),
        q: z.string().optional()
      })
      .parse(req.query);

    const page = Math.max(querySchema.page ?? 1, 1);
    const maxPageSize = (() => {
      const v = Number(process.env.RAW_MAX_PAGE_SIZE ?? '500');
      return Number.isFinite(v) && v > 0 ? Math.floor(v) : 500;
    })();
    const pageSize = Math.min(Math.max(querySchema.pageSize ?? 50, 1), maxPageSize);
    const offset = (page - 1) * pageSize;
    const tableName = SKU_TABLES[querySchema.period];

    const client = await getPool().connect();
    try {
      const sample = await client.query(`SELECT * FROM ${tableName} LIMIT 0`);
      const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);

      const params: Array<string | number> = [];
      const filters: string[] = [];
      const rawQ = querySchema.q?.trim();
      if (rawQ && rawQ.length > 0) {
        const q = `%${rawQ}%`;
        const preferred = ['sku', 'product', 'item', 'description', 'name', 'code', 'รหัส', 'สินค้า'];
        const namesSet = new Set(fieldNames);
        const chosen: string[] = [];
        for (const p of preferred) if (namesSet.has(p)) chosen.push(p);
        for (const n of fieldNames) {
          if (chosen.length >= 8) break;
          if (!chosen.includes(n)) chosen.push(n);
        }
        if (chosen.length > 0) {
          const orParts: string[] = [];
          for (const col of chosen.slice(0, 10)) {
            orParts.push(`CAST(${quoteIdent(col)} AS TEXT) ILIKE $${params.length + 1}`);
            params.push(q);
          }
          filters.push(`(${orParts.join(' OR ')})`);
        }
      }

      const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
      const countSql = `SELECT COUNT(*)::bigint AS cnt FROM ${tableName} ${where}`;
      const dataSql = `SELECT * FROM ${tableName} ${where} OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
      const countResult = await client.query(countSql, params);
      const totalRecords = Number(countResult.rows[0]?.cnt ?? 0);
      const result = await client.query(dataSql, [...params, offset, pageSize]);
      const columns = (result.fields as FieldDef[]).map((f) => f.name);

      res.json({
        data: {
          columns,
          rows: result.rows,
          page,
          pageSize,
          totalRecords,
          totalPages: Math.max(Math.ceil(totalRecords / pageSize), 1)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Product SKU monthly totals comparison (current year vs previous year)
router.get('/sku/monthly-comparison', async (_req, res, next) => {
  try {
    const client = await getPool().connect();
    try {
      const [currentTotals, previousTotals] = await Promise.all([
        loadMonthTotals(client, SKU_TABLES.current),
        loadMonthTotals(client, SKU_TABLES.previous)
      ]);
      const [currentAmountSum, previousAmountSum] = await Promise.all([
        sumAmountColumn(client, SKU_TABLES.current),
        sumAmountColumn(client, SKU_TABLES.previous)
      ]);
      const months = mergeMonthTotals(currentTotals, previousTotals);
      res.json({
        data: {
          months,
          currentYear: new Date().getFullYear(),
          previousYear: new Date().getFullYear() - 1,
          amountTotals: {
            currentAmount: currentAmountSum ?? currentTotals.reduce((a, b) => a + (b.amount ?? 0), 0),
            previousAmount: previousAmountSum ?? previousTotals.reduce((a, b) => a + (b.amount ?? 0), 0)
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

