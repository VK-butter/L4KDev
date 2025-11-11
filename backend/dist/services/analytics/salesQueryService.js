import { mockDataStore } from '../../data/mocks';
function parseDate(date) {
    return new Date(date);
}
function inRange(orderDate, start, end) {
    const current = parseDate(orderDate);
    return current >= start && current <= end;
}
function filterOrders(orders, filters) {
    const start = parseDate(filters.dateStart);
    const end = parseDate(filters.dateEnd);
    return orders.filter((order) => {
        if (!inRange(order.orderDate, start, end)) {
            return false;
        }
        if (filters.categories && filters.categories.length > 0) {
            if (!filters.categories.includes(order.category)) {
                return false;
            }
        }
        if (filters.statuses && filters.statuses.length > 0) {
            if (!filters.statuses.includes(order.status)) {
                return false;
            }
        }
        return true;
    });
}
function calcGrowth(current, previous) {
    if (previous === 0) {
        return current > 0 ? 1 : 0;
    }
    return (current - previous) / previous;
}
export async function getSummary(filters) {
    const orders = await mockDataStore.getOrders();
    const filtered = filterOrders(orders, filters);
    const totalRevenue = filtered.reduce((sum, order) => sum + order.revenue, 0);
    const totalOrders = filtered.length;
    const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
    const rangeMs = parseDate(filters.dateEnd).getTime() - parseDate(filters.dateStart).getTime();
    const priorEnd = parseDate(filters.dateStart);
    const priorStart = new Date(priorEnd.getTime() - rangeMs);
    const prior = orders.filter((order) => inRange(order.orderDate, priorStart, priorEnd));
    const priorRevenue = prior.reduce((sum, order) => sum + order.revenue, 0);
    return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        growthVsPrior: calcGrowth(totalRevenue, priorRevenue)
    };
}
export async function getCategoryBreakdown(filters) {
    const filtered = filterOrders(await mockDataStore.getOrders(), filters);
    const map = new Map();
    filtered.forEach((order) => {
        const entry = map.get(order.category) ?? {
            category: order.category,
            orders: 0,
            revenue: 0
        };
        entry.orders += 1;
        entry.revenue += order.revenue;
        map.set(order.category, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}
export async function getTimeseries(filters) {
    const filtered = filterOrders(await mockDataStore.getOrders(), filters);
    const daily = new Map();
    filtered.forEach((order) => {
        const entry = daily.get(order.orderDate) ?? {
            date: order.orderDate,
            revenue: 0,
            orders: 0
        };
        entry.revenue += order.revenue;
        entry.orders += 1;
        daily.set(order.orderDate, entry);
    });
    return Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date));
}
export async function getDrilldown(options) {
    const orders = await mockDataStore.getOrders();
    const filtered = filterOrders(orders, options).filter((order) => {
        if (options.category && order.category !== options.category) {
            return false;
        }
        if (options.status && order.status !== options.status) {
            return false;
        }
        return true;
    });
    const sorted = filtered.sort((a, b) => parseDate(b.orderDate).getTime() - parseDate(a.orderDate).getTime());
    const pageSize = options.pageSize ?? 25;
    const page = Math.max(options.page ?? 1, 1);
    const offset = (page - 1) * pageSize;
    const paginated = sorted.slice(offset, offset + pageSize);
    const totalPages = Math.max(Math.ceil(sorted.length / pageSize), 1);
    return {
        records: paginated,
        page,
        totalPages,
        totalRecords: sorted.length
    };
}
