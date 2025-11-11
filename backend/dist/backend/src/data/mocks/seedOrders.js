import { mockDataStore } from './index';
const ORDER_COUNT = Number(process.env.SEED_ORDER_COUNT ?? 5000);
const categories = [
    'Hardware',
    'Software',
    'Services',
    'Accessories',
    'Subscriptions'
];
const statuses = ['Pending', 'Fulfilled', 'Cancelled'];
const segments = ['Retail', 'SMB', 'Enterprise'];
function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice(items) {
    return items[Math.floor(Math.random() * items.length)];
}
function buildOrder(index) {
    const today = new Date();
    const orderDate = new Date(today.getTime() - randomBetween(0, 180) * 24 * 60 * 60 * 1000);
    const status = randomChoice(statuses);
    const fulfilledDate = status === 'Fulfilled'
        ? new Date(orderDate.getTime() + randomBetween(1, 10) * 24 * 60 * 60 * 1000)
        : undefined;
    const quantity = randomBetween(1, 25);
    const unitPrice = randomBetween(200, 5000);
    const revenue = quantity * unitPrice;
    const margin = revenue * (Math.random() * 0.4);
    return {
        id: `order-${index.toString().padStart(5, '0')}`,
        orderNumber: `SO-${10000 + index}`,
        customerSegment: randomChoice(segments),
        category: randomChoice(categories),
        status,
        orderDate: orderDate.toISOString().slice(0, 10),
        fulfilledDate: fulfilledDate?.toISOString().slice(0, 10),
        quantity,
        revenue,
        margin
    };
}
async function run() {
    const orders = Array.from({ length: ORDER_COUNT }, (_item, idx) => buildOrder(idx + 1));
    await mockDataStore.saveOrders(orders);
    // eslint-disable-next-line no-console
    console.log(`Generated ${orders.length} mock orders across ${categories.length} categories.`);
}
run();
