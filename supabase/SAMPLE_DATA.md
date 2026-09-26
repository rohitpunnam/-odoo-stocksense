# StockSense Sample Data

Run `seed_sample.sql` in Supabase SQL Editor on the **existing StockSense project**.

It adds:
- 6 sample categories
- 4 sample warehouses
- 12 sample locations
- 20 sample products
- 12 sample receipts (8 completed + 4 ready)
- 12 sample delivery orders (8 completed when stock permits + 4 ready)
- 10 sample transfers (7 completed + 3 ready)
- 8 sample stock adjustments
- a populated stock ledger with historical movements

The script is rerunnable. It removes only its own sample rows and then recreates them.
