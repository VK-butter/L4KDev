import { Router } from 'express';
import { z } from 'zod';
import {
  getCategoryBreakdown,
  getDrilldown,
  getSummary,
  getTimeseries
} from '../../services/analytics/salesQueryService';

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
