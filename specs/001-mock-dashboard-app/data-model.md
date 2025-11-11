# Data Model — Green Sales Dashboard Mock App

## 1. UserAccount
- **Description**: Represents a dashboard user that can authenticate and, if role = `admin`, manage other accounts.
- **Fields**:
  - `id` (UUID, required)
  - `username` (string, unique, 3-32 chars)
  - `displayName` (string, 2-64 chars)
  - `role` (enum: `analyst` | `admin`, default `analyst`)
  - `status` (enum: `active` | `inactive`, default `active`)
  - `passwordHash` (string, required for mock store even if plain)
  - `lastLoginAt` (ISO timestamp, nullable)
- **Validation**:
  - Username unique and lowercased
  - Admin menu operations prohibited when `status = inactive`
- **Relationships**:
  - One-to-one with `UserSession` when user is logged in

## 2. UserSession
- **Description**: Authenticated session stored in memory to gate dashboard routes.
- **Fields**:
  - `sessionId` (UUID, required)
  - `userId` (UUID, references `UserAccount.id`)
  - `role` (enum mirror of UserAccount)
  - `issuedAt` (ISO timestamp)
  - `expiresAt` (ISO timestamp)
- **Validation**:
  - `expiresAt` must be > `issuedAt`
  - Invalidated whenever linked `UserAccount.status` switches to inactive

## 3. SalesOrder
- **Description**: Mock transactional record powering KPIs, charts, and drill-down panels.
- **Fields**:
  - `id` (UUID, required)
  - `orderNumber` (string, human-readable)
  - `customerSegment` (enum: `Retail`, `SMB`, `Enterprise`)
  - `category` (string, from controlled list)
  - `status` (enum: `Pending`, `Fulfilled`, `Cancelled`)
  - `orderDate` (ISO date)
  - `fulfilledDate` (ISO date, nullable)
  - `quantity` (number, >=1)
  - `revenue` (number, >=0, currency USD)
  - `margin` (number, may be negative)
- **Validation**:
  - `fulfilledDate` ≥ `orderDate` when present
  - Derived metrics (AOV, totals) recomputed server-side
- **Relationships**:
  - Aggregated into dashboards per date/category/status filters

## 4. FilterState
- **Description**: Client-side representation of current dashboard filters.
- **Fields**:
  - `dateRange` (tuple: [start ISO date, end ISO date])
  - `categories` (string[])
  - `statuses` (string[])
  - `searchTerm` (string, optional)
- **Validation**:
  - `start <= end`
  - Unknown categories/statuses rejected

## 5. DrilldownRecord
- **Description**: Simplified view of `SalesOrder` for detail panels.
- **Fields**:
  - `orderNumber`
  - `customerSegment`
  - `category`
  - `status`
  - `revenue`
  - `orderDate`
  - `items` (array of `{ sku, name, qty, price }`)
- **Relationships**:
  - Derived from `SalesOrder` + nested `items`

## 6. EmbeddingTarget
- **Description**: Metadata describing each external dashboard placeholder.
- **Fields**:
  - `id` (string, e.g., `superset-main`)
  - `type` (enum: `iframe` | `api`)
  - `title` (string)
  - `description` (string)
  - `placeholderUrl` (string) — iframe src or mock API endpoint
  - `status` (enum: `placeholder` | `ready` | `blocked`)
  - `integrationNotes` (string, markdown)
- **Validation**:
  - HTTPS URLs required for iframe placeholders
  - `type=api` entries must specify response schema reference

## 7. AuditLogEntry (optional but planned)
- **Description**: Tracks admin actions for transparency.
- **Fields**:
  - `id` (UUID)
  - `actorId` (UserAccount reference)
  - `action` (enum: `create`, `update`, `deactivate`)
  - `targetUserId` (UserAccount reference)
  - `timestamp` (ISO)
  - `details` (string)
- **Usage**:
  - Stored in memory for now; future DB table parity
