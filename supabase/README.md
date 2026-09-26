# Supabase integration notes

This folder does not create a new database. The application is designed to use the team's already-created Supabase project.

If your existing schema differs from the canonical names, map it in `src/lib/db.ts` only. Do not duplicate tables locally.

For production-grade concurrency, stock-changing operations should ideally be exposed as Supabase RPC functions/transactions in the existing project. The UI repository includes a safe sequential fallback and refuses to complete a delivery if the available quantity is insufficient.
