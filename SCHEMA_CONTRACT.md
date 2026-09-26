# StockSense — Existing Supabase Schema Contract

This project is wired to the existing Supabase database supplied for the StockSense/Odoos project. **Do not create a second database and do not create a `stock_levels` table.**

## Tables used by the frontend

- `profiles`
- `categories`
- `warehouses`
- `locations`
- `products`
- `receipts`
- `receipt_items`
- `delivery_orders`
- `delivery_items`
- `transfers`
- `adjustments`
- `stock_ledger`

## Views used for derived stock data

- `v_stock_balance` — stock balance by product/location/warehouse, calculated from `stock_ledger`.
- `v_product_stock` — total stock by product.
- `v_stock_moves` — enriched ledger/movement view.
- `v_documents` — unified receipts, deliveries, transfers and adjustments for dashboard-style listings.

## Stored procedures used for validation

- `validate_receipt(p_receipt_id uuid)`
- `validate_delivery(p_delivery_id uuid)`
- `validate_transfer(p_transfer_id uuid)`

Adjustments are logged to the ledger by the existing `trg_log_adjustment` trigger.

## Important field mappings

Frontend product fields are normalized as:

- `unit` ↔ `products.unit_of_measure`
- `reorder_level` ↔ `products.reorder_threshold`

Frontend stock is normalized from `v_stock_balance`:

- `product_id`
- `location_id`
- `warehouse_id`
- `quantity`

Receipts use `receipt_items.quantity_received` / `quantity_expected`.

Deliveries use the `delivery_orders` table (not a `deliveries` table).

Transfers use `from_location_id` and `to_location_id`.

Adjustments use `recorded_qty`, `counted_qty`, and `difference`, with `location_id`.

Ledger uses `quantity_change`, `reason`, `location_id`, and `reference_id`.
