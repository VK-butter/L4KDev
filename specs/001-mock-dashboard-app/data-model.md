# Data Model — Green Sales Dashboard

## 1. UserAccount

Represents a dashboard user that can authenticate and, if `role = admin`, manage other accounts.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Required |
| `username` | string | Unique, 3–32 chars, lowercased |
| `displayName` | string | 2–64 chars |
| `role` | `analyst` \| `admin` | Default: `analyst` |
| `status` | `active` \| `inactive` | Default: `active` |
| `passwordHash` | string | Required (plaintext in mock store) |
| `lastLoginAt` | ISO timestamp | Nullable |

**Rules:** Admin operations are blocked when `status = inactive`.

---

## 2. UserSession

Authenticated session stored in memory to gate dashboard routes.

| Field | Type | Notes |
|-------|------|-------|
| `sessionId` | UUID | Required |
| `userId` | UUID | References `UserAccount.id` |
| `role` | `analyst` \| `admin` | Mirror of UserAccount.role |
| `issuedAt` | ISO timestamp | |
| `expiresAt` | ISO timestamp | Must be > `issuedAt` |

**Rules:** Invalidated when linked `UserAccount.status` switches to `inactive`.

---

## 3. SalesOrder (Mock)

Mock transactional record powering KPIs, charts, and drilldown panels.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Required |
| `orderNumber` | string | Human-readable identifier |
| `customerSegment` | `Retail` \| `SMB` \| `Enterprise` | |
| `category` | string | From controlled list |
| `status` | `Pending` \| `Fulfilled` \| `Cancelled` | |
| `orderDate` | ISO date | |
| `fulfilledDate` | ISO date | Nullable; must be >= `orderDate` |
| `quantity` | number | >= 1 |
| `revenue` | number | >= 0, USD |
| `margin` | number | May be negative |

Derived KPI metrics (AOV, totals, growth) are computed server-side from filtered results.

---

## 4. PostgreSQL Tables (Live Data)

Schema: `l4k_model` in database `sales_warehouse`.

| Table | Purpose |
|-------|---------|
| `joinsales_orderline` | Primary sales order line data |
| `"SKU_dataCurrent"` | Current year product SKU data |
| `"SKU_dataPrevious"` | Previous year SKU data (for YoY comparison) |

Column names are auto-detected at runtime. Override via env vars:
- `RAW_DATE_COLUMN` — date filter column (default: "Order Date")
- `RAW_STATUS_COLUMN` — status filter column
- `RAW_REVENUE_COLUMN` — revenue aggregation column
- `RAW_QUANTITY_COLUMN` — quantity aggregation column

---

## 5. FilterState

Client-side representation of current dashboard filters (stored in URL via `useSearchParams`).

| Field | Type | Notes |
|-------|------|-------|
| `dateRange` | `[start ISO date, end ISO date]` | Default: last 30 days |
| `categories` | `string[]` | Empty = all categories |
| `statuses` | `string[]` | Empty = all statuses |

**Rules:** `start <= end`; unknown categories/statuses are ignored.

---

## 6. DrilldownRecord

Simplified view of `SalesOrder` for detail panels.

| Field | Type |
|-------|------|
| `orderNumber` | string |
| `customerSegment` | string |
| `category` | string |
| `status` | string |
| `revenue` | number |
| `orderDate` | string |

---

## 7. EmbeddingTarget

Metadata describing each external dashboard or embed panel.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | e.g., `superset-main` |
| `type` | `iframe` \| `api` | |
| `title` | string | |
| `description` | string | |
| `placeholderUrl` | string | iframe src or mock API endpoint |
| `status` | `placeholder` \| `ready` \| `blocked` | |
| `viewId` | string | NocoDB view ID (optional) |
| `projectSlug` | string | NocoDB project slug (optional) |
| `tableSlug` | string | NocoDB table slug (optional) |
| `defaultLimit` | number | Default record fetch limit (optional) |

**Rules:** HTTPS URLs required for iframe placeholders.

---

## 8. AuditLogEntry

Tracks admin actions for transparency. Stored in file-based mock store (`audit-log.json`).

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | |
| `actorId` | UUID | References `UserAccount.id` |
| `action` | `create` \| `update` \| `deactivate` \| `reactivate` \| `delete` | |
| `targetUserId` | UUID | References `UserAccount.id` |
| `timestamp` | ISO timestamp | |
| `details` | string | Optional description |
