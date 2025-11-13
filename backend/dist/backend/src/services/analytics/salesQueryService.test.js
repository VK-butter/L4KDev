import { describe, it, expect, beforeAll } from 'vitest';
import { getSummary, getCategoryBreakdown, getTimeseries, getDrilldown } from './salesQueryService';
import { mockDataStore } from '../../data/mocks';
const sampleOrders = [
    {
        id: 'order-1',
        orderNumber: 'SO-1',
        customerSegment: 'Enterprise',
        category: 'Hardware',
        status: 'Fulfilled',
        orderDate: '2025-10-01',
        fulfilledDate: '2025-10-03',
        quantity: 10,
        revenue: 1000,
        margin: 300
    },
    {
        id: 'order-2',
        orderNumber: 'SO-2',
        customerSegment: 'SMB',
        category: 'Software',
        status: 'Pending',
        orderDate: '2025-10-02',
        quantity: 5,
        revenue: 500,
        margin: 150
    }
];
describe('salesQueryService', () => {
    beforeAll(async () => {
        await mockDataStore.saveOrders(sampleOrders);
    });
    it('computes summary statistics', async () => {
        const summary = await getSummary({
            dateStart: '2025-09-25',
            dateEnd: '2025-10-10'
        });
        expect(summary.totalOrders).toBe(2);
        expect(summary.totalRevenue).toBe(1500);
        expect(summary.averageOrderValue).toBe(750);
    });
    it('returns category breakdown', async () => {
        const breakdown = await getCategoryBreakdown({
            dateStart: '2025-09-25',
            dateEnd: '2025-10-10'
        });
        expect(breakdown).toHaveLength(2);
        expect(breakdown[0].category).toBe('Hardware');
    });
    it('builds timeseries points', async () => {
        const points = await getTimeseries({
            dateStart: '2025-09-25',
            dateEnd: '2025-10-10'
        });
        expect(points).toHaveLength(2);
        expect(points[0]).toMatchObject({ date: '2025-10-01', orders: 1 });
    });
    it('paginates drilldown results', async () => {
        const result = await getDrilldown({
            dateStart: '2025-09-25',
            dateEnd: '2025-10-10',
            pageSize: 1
        });
        expect(result.records).toHaveLength(1);
        expect(result.totalPages).toBe(2);
    });
});
