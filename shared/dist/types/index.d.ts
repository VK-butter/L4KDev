export type UserRole = 'analyst' | 'admin';
export interface UserAccount {
    id: string;
    username: string;
    displayName: string;
    role: UserRole;
    status: 'active' | 'inactive';
    lastLoginAt?: string;
    passwordHash?: string;
}
export interface UserSession {
    sessionId: string;
    userId: string;
    role: UserRole;
    issuedAt: string;
    expiresAt: string;
}
export interface SalesOrder {
    id: string;
    orderNumber: string;
    customerSegment: 'Retail' | 'SMB' | 'Enterprise';
    category: string;
    status: 'Pending' | 'Fulfilled' | 'Cancelled';
    orderDate: string;
    fulfilledDate?: string;
    quantity: number;
    revenue: number;
    margin: number;
}
export interface FilterState {
    dateRange: [string, string];
    categories: string[];
    statuses: string[];
    searchTerm?: string;
}
export interface DrilldownItem {
    sku: string;
    name: string;
    qty: number;
    price: number;
}
export interface DrilldownRecord {
    orderNumber: string;
    customerSegment: SalesOrder['customerSegment'];
    category: string;
    status: SalesOrder['status'];
    revenue: number;
    orderDate: string;
    items: DrilldownItem[];
}
export interface EmbeddingTarget {
    id: string;
    type: 'iframe' | 'api';
    title: string;
    description: string;
    placeholderUrl: string;
    status: 'placeholder' | 'ready' | 'blocked';
    integrationNotes?: string;
    viewId?: string;
    projectSlug?: string;
    tableSlug?: string;
    defaultLimit?: number;
    manageUrl?: string;
}
export interface AuditLogEntry {
    id: string;
    actorId: string;
    action: 'create' | 'update' | 'deactivate' | 'reactivate' | 'delete';
    targetUserId: string;
    timestamp: string;
    details?: string;
}
export interface AnalyticsSummary {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    growthVsPrior: number;
}
export interface AnalyticsCategoryBreakdown {
    category: string;
    orders: number;
    revenue: number;
}
export interface AnalyticsTimeseriesPoint {
    date: string;
    revenue: number;
    orders: number;
}
export interface AnalyticsDrilldownResponse {
    records: SalesOrder[];
    page: number;
    totalPages: number;
    totalRecords: number;
}
