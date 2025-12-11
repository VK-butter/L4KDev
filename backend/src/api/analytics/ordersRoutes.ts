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
