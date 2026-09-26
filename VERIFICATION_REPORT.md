# StockSense v1.6 Verification Report

Date: 2026-09-26

## Source checks completed
- TypeScript/TSX parser check: PASS (no syntax diagnostics).
- Application code contains no live `stock_levels` table access.
- Existing Supabase-backed views used by the app were confirmed: `v_stock_balance`, `v_product_stock`, `v_stock_moves`, `v_documents`.
- Existing validation RPCs confirmed: `validate_receipt`, `validate_delivery`, `validate_transfer`.
- All actual `<button>` elements have either a click handler or are form submit controls.
- Profile loading was hardened so asynchronous profile data cannot be overwritten by stale default form state.
- Client-side validation was hardened for product, category, warehouse, receipt, delivery, transfer and adjustment inputs.
- Failed multi-step receipt/delivery/transfer/product operations now clean up newly created partial records when a subsequent operation fails.

## Database smoke test
A temporary rollback-safe test against the existing Supabase database verified this flow:

1. Receipt of 100 units -> 100 at default location.
2. Delivery of 30 units -> 70 at default location.
3. Transfer of 20 units -> 50 at source, 20 at destination.
4. Adjustment of destination from 20 to 17 -> 17 at destination.
5. Total stock -> 67.
6. Ledger entries -> 5 (receipt, delivery, transfer out, transfer in, adjustment).
7. Temporary QA rows were removed; final query confirmed zero QA rows remained.

## Local build limitation
The verification environment could not download npm packages because external npm registry DNS/network access was unavailable. Therefore a complete package installation and browser production build could not be executed here. The project should be verified locally with:

```bash
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

## Existing database security observation
The current Supabase project has RLS disabled on the inventory tables and grants table access to `anon`. The validation RPCs are restricted to `authenticated`. The frontend does not change these settings. Review RLS/grants before production deployment.


## OTP login verification

The authentication UI was updated to use Supabase Auth passwordless OTP as the default login path. It supports email OTP and phone/SMS OTP, validates a 6-digit code, enforces a 60-second resend cooldown in the UI, and keeps password login as an alternate method. The implementation follows the current Supabase JavaScript Auth API (`signInWithOtp` + `verifyOtp`).

Email OTP requires the Supabase email template to contain `{{ .Token }}`. Phone OTP requires the project's Phone Auth setting and an SMS provider. These are Supabase project-level configuration requirements and cannot be guaranteed by frontend code alone.

A TypeScript/TSX transpile check of `src/main.tsx` reports zero syntax diagnostics. A full dependency install/browser build could not be executed in the isolated environment because npm registry access timed out.
