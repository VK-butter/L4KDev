/**
 * Audit joinsales_orderline (same column detection as analytics routes):
 * - Mixed orders: same order_key has both complete-type and cancel-type lines.
 * - Reconciliation: with "cancel wins", Cancel + Complete-only vs total distinct orders.
 *
 * Run: pnpm exec tsx scripts/checkMixedOrderStatus.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { PoolClient } from 'pg';
import { getPool } from '../src/db/pool';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

type FieldDef = { name: string };

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u0e00-\u0e7f]/g, '');
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

function resolveColumns(fieldNames: string[]) {
  const envDate = process.env.RAW_DATE_COLUMN?.trim();
  const envStatus = process.env.RAW_STATUS_COLUMN?.trim();
  const date =
    (envDate && fieldNames.find((n) => n === envDate)) ||
    pickColumn(fieldNames, ['order date', 'date_order', 'orderdate', 'date']) ||
    'order_date';

  const status =
    (envStatus && fieldNames.find((n) => n === envStatus)) ||
    pickColumn(fieldNames, ['status', 'orderstatus', 'itemstatus', 'sale_status', 'สถานะ']) ||
    null;

  const order = pickColumn(fieldNames, ['order_name', 'order', 'name']);

  return { date, status, order };
}

async function main() {
  const client: PoolClient = await getPool().connect();
  try {
    const sample = await client.query('SELECT * FROM l4k_model.joinsales_orderline LIMIT 0');
    const fieldNames = (sample.fields as FieldDef[]).map((f) => f.name);
    const cols = resolveColumns(fieldNames);

    if (!cols.status) {
      console.error('Could not resolve status column on joinsales_orderline.');
      process.exit(1);
    }

    const dateCol = quoteIdent(cols.date);
    const statusCol = quoteIdent(cols.status);
    const orderKeyExpr = cols.order
      ? `COALESCE(NULLIF(TRIM(CAST(j.${quoteIdent(cols.order)} AS TEXT)), ''), j.ctid::text)`
      : 'j.ctid::text';

    const bucketExpr = `CASE
      WHEN LOWER(TRIM(CAST(j.${statusCol} AS TEXT))) IN ('complete','completed','saled','fulfilled') THEN 'complete'
      WHEN LOWER(TRIM(CAST(j.${statusCol} AS TEXT))) IN ('cancel','cancelled','canceled') THEN 'cancel'
      ELSE 'other'
    END`;

    const flagsCte = `
      WITH base AS (
        SELECT
          ${orderKeyExpr} AS order_key,
          ${bucketExpr} AS bucket
        FROM l4k_model.joinsales_orderline j
      ),
      flags AS (
        SELECT
          order_key,
          bool_or(bucket = 'complete') AS has_complete,
          bool_or(bucket = 'cancel') AS has_cancel
        FROM base
        GROUP BY order_key
      )
    `;

    const summary = await client.query(`
      ${flagsCte}
      SELECT
        COUNT(*) FILTER (WHERE has_complete AND has_cancel)::bigint AS mixed_complete_cancel_orders
      FROM flags
    `);
    const row = summary.rows[0] ?? {};
    const mixed = Number(row.mixed_complete_cancel_orders ?? 0);

    const recon = await client.query(`
      ${flagsCte}
      SELECT
        COUNT(*)::bigint AS total_orders,
        COUNT(*) FILTER (WHERE has_cancel)::bigint AS orders_cancel_wins,
        COUNT(*) FILTER (WHERE NOT has_cancel AND has_complete)::bigint AS orders_complete_only,
        COUNT(*) FILTER (WHERE NOT has_cancel AND NOT has_complete)::bigint AS orders_other_only
      FROM flags
    `);
    const r = recon.rows[0] ?? {};
    const total = Number(r.total_orders ?? 0);
    const cancelWins = Number(r.orders_cancel_wins ?? 0);
    const completeOnly = Number(r.orders_complete_only ?? 0);
    const otherOnly = Number(r.orders_other_only ?? 0);
    const completePlusCancel = cancelWins + completeOnly;

    console.log('Columns used:', { date: cols.date, status: cols.status, order: cols.order ?? '(ctid fallback)' });
    console.log('');
    console.log('--- Cancel wins (any cancel line => whole order counts as cancel) vs total ---');
    console.log('Total distinct orders (all lines):', total);
    console.log('  Cancel (has any cancel line):', cancelWins);
    console.log('  Complete (no cancel line, has at least one complete line):', completeOnly);
    console.log('  Other (no cancel and no complete line — all rows are "other" bucket):', otherOnly);
    console.log('  Cancel + Complete (mutually exclusive):', completePlusCancel);
    console.log('  Diff vs total (should equal "Other"):', total - completePlusCancel, otherOnly === total - completePlusCancel ? 'OK' : 'MISMATCH');
    console.log('');
    console.log('Orders with BOTH at least one Complete-type line AND one Cancel-type line:', mixed);
    console.log('');

    if (mixed > 0) {
      const samples = await client.query(
        `
        WITH base AS (
          SELECT
            ${orderKeyExpr} AS order_key,
            ${bucketExpr} AS bucket,
            CAST(j.${statusCol} AS TEXT) AS raw_status
          FROM l4k_model.joinsales_orderline j
        ),
        flags AS (
          SELECT order_key
          FROM base
          GROUP BY order_key
          HAVING bool_or(bucket = 'complete') AND bool_or(bucket = 'cancel')
        )
        SELECT b.order_key, b.raw_status, b.bucket
        FROM base b
        INNER JOIN flags f ON f.order_key = b.order_key
        ORDER BY b.order_key, b.raw_status
        LIMIT 40
        `
      );
      console.log('Sample rows (up to 40) from mixed orders:');
      console.table(samples.rows);
    } else {
      console.log('No orders found where the same order_key has both complete-type and cancel-type lines.');
    }
  } finally {
    client.release();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
