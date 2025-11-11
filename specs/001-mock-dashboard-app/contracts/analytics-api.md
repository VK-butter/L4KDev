# Analytics API Contract

Base URL: `/api/analytics`

## Authentication
- Requires valid session (analyst or admin).

## Endpoints

### GET `/orders/summary`
- **Purpose**: Return KPI cards (totals, revenue, AOV) for current filters.
- **Query Params**:
  - `dateStart` (ISO date, required)
  - `dateEnd` (ISO date, required)
  - `categories` (comma string)
  - `statuses` (comma string)
- **Response**:
```json
{
  "data": {
    "totalOrders": 420,
    "totalRevenue": 582000,
    "averageOrderValue": 1385.71,
    "growthVsPrior": 0.12
  }
}
```

### GET `/orders/by-category`
- **Purpose**: Dataset for revenue/category bar chart.
- **Response**:
```json
{
  "data": [
    { "category": "Hardware", "orders": 120, "revenue": 220000 },
    { "category": "Software", "orders": 180, "revenue": 280000 }
  ]
}
```

### GET `/orders/timeseries`
- **Purpose**: Supplies area/line chart for revenue over time.

### GET `/orders/drilldown`
- **Purpose**: Return paginated order records backing the detail panel.
- **Query Params**: `category`, `status`, `page`, `pageSize`
- **Response**:
```json
{
  "data": {
    "records": [
      {
        "orderNumber": "SO-10045",
        "customerSegment": "Enterprise",
        "category": "Hardware",
        "status": "Fulfilled",
        "revenue": 12500,
        "orderDate": "2025-10-01",
        "items": [
          { "sku": "HW-44", "name": "Sensor Kit", "qty": 10, "price": 1200 }
        ]
      }
    ],
    "page": 1,
    "totalPages": 4
  }
}
```

### GET `/embeds`
- **Purpose**: Returns metadata for Superset iframe + NocoDB placeholder (type, url, notes) so the frontend rendering module stays declarative.
