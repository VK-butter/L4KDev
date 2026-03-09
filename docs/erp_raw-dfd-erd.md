# erp_raw Data Flow & Entity Model

Generated on: 2026-03-07  
Database: `sales_warehouse`  
Schema: `erp_raw`

## Scope and Method

- This schema contains 29 base tables and 1,038 columns.
- No explicit primary-key/foreign-key constraints are declared in `information_schema`.
- ERD relationships below are inferred from Odoo-style naming and validated by ID-match checks on live data.

## DFD (Level 1)

```mermaid
flowchart LR
  U1[Sales/Admin Users] --> P1[Process Sales Orders]
  U2[Purchasing Users] --> P2[Process Purchase Orders]
  U3[Warehouse Users] --> P3[Process Inventory Moves]
  U4[Finance Users] --> P4[Invoice and Reconcile]
  J1[ETL or Sync Jobs] --> P1
  J1 --> P2
  J1 --> P3
  J1 --> P4

  D0[(Master Data\nres_partner,res_users,crm_team,\nproduct_*,stock_warehouse,stock_location)]
  D1[(Sales\nsale_order,sale_order_line,\naccount_tax_sale_order_line_rel,\nsale_order_line_invoice_rel)]
  D2[(Purchasing\npurchase_order,purchase_order_line)]
  D3[(Inventory\nstock_move,stock_move_line,\nstock_quant,stock_valuation_layer)]
  D4[(Accounting\naccount_move,account_move_line,\naccount_payment,\naccount_partial_reconcile,\naccount_full_reconcile,\naccount_account,account_tax)]

  P1 <--> D0
  P1 <--> D1
  P1 --> P4

  P2 <--> D0
  P2 <--> D2
  P2 --> P3

  P3 <--> D0
  P3 <--> D3
  P3 --> P4

  P4 <--> D0
  P4 <--> D4
  D1 --> P4
  D2 --> P4
  D3 --> P4
```

## ERD (Inferred + Live-Validated)

```mermaid
erDiagram
  PRODUCT_CATEGORY ||--o{ PRODUCT_TEMPLATE : categ_id
  PRODUCT_TEMPLATE ||--o{ PRODUCT_PRODUCT : product_tmpl_id

  RES_USERS ||--o{ RES_PARTNER : user_id
  RES_PARTNER ||--o{ RES_USERS : partner_id
  CRM_TEAM ||--o{ SALE_ORDER : team_id
  RES_USERS ||--o{ SALE_ORDER : user_id
  RES_PARTNER ||--o{ SALE_ORDER : partner_id
  STOCK_WAREHOUSE ||--o{ SALE_ORDER : warehouse_id

  SALE_ORDER ||--o{ SALE_ORDER_LINE : order_id
  PRODUCT_PRODUCT ||--o{ SALE_ORDER_LINE : product_id
  RES_PARTNER ||--o{ SALE_ORDER_LINE : order_partner_id
  CRM_TEAM ||--o{ SALE_ORDER_LINE : team_id

  SALE_ORDER_LINE ||--o{ ACCOUNT_TAX_SALE_ORDER_LINE_REL : sale_order_line_id
  ACCOUNT_TAX ||--o{ ACCOUNT_TAX_SALE_ORDER_LINE_REL : account_tax_id
  SALE_ORDER_LINE ||--o{ SALE_ORDER_LINE_INVOICE_REL : order_line_id
  ACCOUNT_MOVE_LINE ||--o{ SALE_ORDER_LINE_INVOICE_REL : invoice_line_id

  ACCOUNT_MOVE ||--o{ ACCOUNT_MOVE_LINE : move_id
  ACCOUNT_ACCOUNT ||--o{ ACCOUNT_MOVE_LINE : account_id
  ACCOUNT_PAYMENT ||--o{ ACCOUNT_MOVE_LINE : payment_id
  ACCOUNT_FULL_RECONCILE ||--o{ ACCOUNT_MOVE_LINE : full_reconcile_id
  RES_PARTNER ||--o{ ACCOUNT_MOVE : partner_id
  STOCK_MOVE ||--o{ ACCOUNT_MOVE : stock_move_id

  ACCOUNT_MOVE_LINE ||--o{ ACCOUNT_PARTIAL_RECONCILE : debit_move_id
  ACCOUNT_MOVE_LINE ||--o{ ACCOUNT_PARTIAL_RECONCILE : credit_move_id
  ACCOUNT_FULL_RECONCILE ||--o{ ACCOUNT_PARTIAL_RECONCILE : full_reconcile_id

  RES_PARTNER ||--o{ PURCHASE_ORDER : partner_id
  RES_USERS ||--o{ PURCHASE_ORDER : user_id
  STOCK_PICKING_TYPE ||--o{ PURCHASE_ORDER : picking_type_id
  PURCHASE_ORDER ||--o{ PURCHASE_ORDER_LINE : order_id
  PRODUCT_PRODUCT ||--o{ PURCHASE_ORDER_LINE : product_id
  SALE_ORDER ||--o{ PURCHASE_ORDER_LINE : sale_order_id
  SALE_ORDER_LINE ||--o{ PURCHASE_ORDER_LINE : sale_line_id

  PRODUCT_PRODUCT ||--o{ STOCK_MOVE : product_id
  STOCK_LOCATION ||--o{ STOCK_MOVE : location_id
  STOCK_LOCATION ||--o{ STOCK_MOVE : location_dest_id
  STOCK_WAREHOUSE ||--o{ STOCK_MOVE : warehouse_id
  SALE_ORDER_LINE ||--o{ STOCK_MOVE : sale_line_id
  PURCHASE_ORDER_LINE ||--o{ STOCK_MOVE : purchase_line_id

  STOCK_MOVE ||--o{ STOCK_MOVE_LINE : move_id
  PRODUCT_PRODUCT ||--o{ STOCK_MOVE_LINE : product_id
  STOCK_LOCATION ||--o{ STOCK_MOVE_LINE : location_id
  STOCK_LOCATION ||--o{ STOCK_MOVE_LINE : location_dest_id

  PRODUCT_PRODUCT ||--o{ STOCK_QUANT : product_id
  STOCK_LOCATION ||--o{ STOCK_QUANT : location_id
  PRODUCT_CATEGORY ||--o{ STOCK_QUANT : categ_id

  STOCK_MOVE ||--o{ STOCK_VALUATION_LAYER : stock_move_id
  ACCOUNT_MOVE ||--o{ STOCK_VALUATION_LAYER : account_move_id
  PRODUCT_PRODUCT ||--o{ STOCK_VALUATION_LAYER : product_id
  PRODUCT_CATEGORY ||--o{ STOCK_VALUATION_LAYER : categ_id

  STOCK_WAREHOUSE ||--o{ STOCK_PICKING_TYPE : warehouse_id
  RES_PARTNER ||--o{ STOCK_WAREHOUSE : partner_id
```

## Relationship Validation Notes

Validated using distinct non-null `*_id` values joined to target table `id`.

- Most inferred relationships are exact or near-exact (`0.00%` unmatched IDs).
- Minor unmatched keys observed:
  - `sale_order_line.order_id -> sale_order.id`: 33 distinct unmatched IDs (`0.06%`)
  - `sale_order_line.order_partner_id -> res_partner.id`: 2 (`0.04%`)
  - `account_tax_sale_order_line_rel.sale_order_line_id -> sale_order_line.id`: 15 (`~0.00%`)
  - `stock_move.sale_line_id -> sale_order_line.id`: 15 (`~0.00%`)

These are typically ETL lag, soft-deleted upstream records, or historical drift.

## Table Catalog (erp_raw)

| Table | Rows |
|---|---:|
| `account_account` | 620 |
| `account_account_type` | 19 |
| `account_full_reconcile` | 31,639 |
| `account_move` | 540,248 |
| `account_move_line` | 1,587,645 |
| `account_partial_reconcile` | 66,112 |
| `account_payment` | 42,852 |
| `account_tax` | 19 |
| `account_tax_sale_order_line_rel` | 370,567 |
| `crm_team` | 14 |
| `product_category` | 129 |
| `product_product` | 35,734 |
| `product_template` | 34,710 |
| `purchase_order` | 19,043 |
| `purchase_order_line` | 86,895 |
| `res_country_state` | 1,469 |
| `res_currency_rate` | 1,152 |
| `res_partner` | 27,377 |
| `res_users` | 133 |
| `sale_order` | 54,842 |
| `sale_order_line` | 470,648 |
| `sale_order_line_invoice_rel` | 262,420 |
| `stock_location` | 834 |
| `stock_move` | 1,565,731 |
| `stock_move_line` | 1,017,877 |
| `stock_picking_type` | 83 |
| `stock_quant` | 377,503 |
| `stock_valuation_layer` | 488,308 |
| `stock_warehouse` | 8 |

## Recommended Next Step

If you want strict ERD tooling support (dbdiagram, DBeaver FK graph, etc.), create a curated modeling schema that adds explicit PK/FK constraints on top of `erp_raw`.
