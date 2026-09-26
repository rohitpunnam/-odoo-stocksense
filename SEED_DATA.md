# Seeded Supabase Sample Data

The StockSense project uses the existing Supabase database. A realistic sample dataset has been loaded into that same project.

Current sample records include 6 categories, 4 warehouses, 12 locations, 20 products, 12 receipts, 12 delivery orders, 10 transfers, 9 adjustments, and 62+ stock-ledger movements (including an explicit out-of-stock item for the dashboard alerts).

The repeatable SQL is in `supabase/seed_sample.sql` and only targets the sample SKU range and sample warehouse/location/partner names.

After starting the app, log in and press **Refresh Data** on the dashboard. The same Supabase records are what the website reads, so the seeded data appears in the Products, Receipts, Delivery, Transfers, Adjustments, Move History and Reports screens.
