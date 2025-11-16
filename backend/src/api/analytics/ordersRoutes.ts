import { Router } from 'express';
import { z } from 'zod';
import {
  getCategoryBreakdown,
  getDrilldown,
  getSummary,
  getTimeseries
} from '../../services/analytics/salesQueryService';
import { getPool } from '../../db/pool';
import type { FieldDef } from 'pg';

const router = Router();

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

      const hasDateFilter = querySchema.dateStart && querySchema.dateEnd;
      const where = hasDateFilter ? `WHERE (${dateColumn}::date BETWEEN $1 AND $2)` : '';
      const params: Array<string | number> = hasDateFilter
        ? [querySchema.dateStart as string, querySchema.dateEnd as string]
        : [];

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
