# StockSense Sample / QA Checklist

## Authentication
- [ ] Sign up works against the existing Supabase Auth project.
- [ ] Login redirects to Dashboard.
- [ ] Logout returns to Login.
- [ ] Password recovery can send and verify a recovery OTP.

## Dashboard
- [ ] Supabase live indicator is visible after login.
- [ ] Quick actions navigate to their corresponding sections.
- [ ] KPI cards reflect live data.
- [ ] Inventory health and stock alerts are based on current ledger-derived stock.
- [ ] Warehouse pulse reflects current warehouse totals.
- [ ] Operational activity filters work.
- [ ] Export snapshot downloads a CSV.
- [ ] Reports opens from the dashboard.

## Products
- [ ] Search and category filter work.
- [ ] Product creation works.
- [ ] Optional initial stock creates a ledger movement.
- [ ] Product edit works.
- [ ] Low / Healthy / Out health status updates from current stock.

## Receipts
- [ ] Receipt creation works.
- [ ] Product lines can be added/removed.
- [ ] Validation increases stock through the existing Supabase RPC.

## Delivery orders
- [ ] Delivery creation works.
- [ ] Insufficient stock is rejected before validation.
- [ ] Validation decreases stock through the existing Supabase RPC.

## Internal transfers
- [ ] Source and destination locations can be selected.
- [ ] Same source/destination is rejected.
- [ ] Insufficient source stock is rejected.
- [ ] Validation creates transfer-out and transfer-in ledger movements.

## Adjustments
- [ ] Recorded quantity is displayed.
- [ ] Physical count can be entered.
- [ ] Difference is logged by the existing database trigger.

## Move history / Reports
- [ ] Ledger search works.
- [ ] Ledger CSV export works.
- [ ] Inventory CSV export works.

## Hardening checks
- [ ] Run `npm.cmd install` successfully on the development PC.
- [ ] Run `npm.cmd run build` successfully before merging to `main`.
- [ ] Keep `.env` out of Git.
- [ ] Use only the Supabase anon/public key in the browser.

## UX
- [ ] Command palette opens with Ctrl/Cmd+K.
- [ ] Escape closes overlays.
- [ ] Theme toggle works and persists after refresh.
- [ ] Mobile sidebar opens and closes.
- [ ] All primary navigation buttons are interactive.

## Live sample dataset

The connected Supabase project already contains the StockSense sample dataset after seeding. Refresh the app after login to see the sample products, stock balances, warehouses, receipts, deliveries, transfers, adjustments and ledger history.
