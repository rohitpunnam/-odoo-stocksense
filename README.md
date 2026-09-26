# StockSense IMS

A modular Inventory Management System using **React + TypeScript + Supabase**. The application uses the existing Supabase project as its only persistence layer; no local database is required.

## Current UI

Version 1.3 includes a new calm-but-vibrant visual system using deep teal, muted indigo, coral and amber accents. The dashboard is organized around quick actions, inventory health, stock alerts, recent activity and warehouse distribution.

## Added features

- Command palette (`Ctrl+K` / `Cmd+K`) for fast navigation and product search.
- Inventory alerts drawer for low/out-of-stock SKUs.
- Dark mode with local preference persistence.
- Quick actions for common inventory workflows.
- Inventory health percentage and threshold summary.
- Warehouse stock pulse visualization.
- Reports page with inventory summary and CSV exports.
- CSV export for the stock snapshot and ledger.
- Improved responsive/mobile navigation.
- Existing Supabase ledger workflow is preserved.

## Run locally

```bash
npm install
npm run dev
```

If PowerShell blocks `npm.ps1` on Windows, use:

```powershell
npm.cmd install
npm.cmd run dev
```

Create `.env` from `.env.example` and add the credentials of the **existing Supabase project**:

```env
VITE_SUPABASE_URL=your_existing_supabase_url
VITE_SUPABASE_ANON_KEY=your_existing_supabase_anon_key
```

Never commit `.env` or a Supabase service-role key.

## Existing database

The frontend uses the existing tables/views already present in the Supabase project. Stock is derived from the ledger/view structure rather than a `stock_levels` table.

Core stock operations call the existing Supabase RPC functions for receipt, delivery and transfer validation.

## GitHub team split

Use the four branches and the commit plan in `COMMIT_PLAN.md`. Keep each member's feature area focused and merge through pull requests.


## Verification status

The source was checked for TypeScript/TSX syntax errors, outdated `stock_levels` references in application code, and buttons without a real action handler. The existing Supabase schema was also checked directly. A rollback-safe end-to-end database smoke test verified receipt, delivery, transfer, adjustment and ledger stock-flow behavior using temporary QA rows; the QA rows were removed and a final check confirmed no QA rows remain.

A full `npm install` / production browser build could not be executed in the isolated verification environment because npm registry DNS/network access was unavailable. Run `npm.cmd install` and `npm.cmd run build` on the development PC before the final GitHub merge.

### Existing Supabase security note

The connected project currently has Row Level Security disabled on the inventory tables and grants table access to the `anon` role. The validation RPC functions themselves are restricted to `authenticated`. This is an existing database configuration, not something this frontend package changes. For a real production deployment, enable appropriate RLS policies and restrict anonymous table access before exposing the project publicly.


## Login verification (OTP)

StockSense supports passwordless OTP login through Supabase Auth for email and phone numbers. Email OTP requires an email template with `{{ .Token }}`. Phone OTP requires phone authentication and a configured SMS provider in Supabase. Password login remains available as an alternate method.


### Supabase Auth configuration for OTP

For **email OTP**, go to Supabase Dashboard → Authentication → Email Templates and make sure the login email contains `{{ .Token }}`. Supabase documents that `signInWithOtp({ email })` sends an OTP when the template uses the token variable; `verifyOtp({ email, token, type: 'email' })` completes the login.

For **phone OTP**, enable Phone authentication and configure an SMS provider in the same Supabase project. The application uses `signInWithOtp({ phone })` and `verifyOtp({ phone, token, type: 'sms' })`. Supabase documents that phone OTP requires an SMS provider such as Twilio, MessageBird or Vonage.

The login screen uses **One-time code** as the default method and lets the user choose **Email OTP** or **Phone OTP**. Password login is retained as an alternate method. OTP login is restricted to existing users with `shouldCreateUser: false`, so requesting a code does not silently create a new inventory account.

## Sample data

The existing Supabase project can be populated with realistic sample data using `supabase/seed_sample.sql`.
The seed uses the `SS-001` through `SS-020` sample SKUs plus the sample warehouse, location and partner names, so it can be rerun without deleting unrelated project data.
The application reads the same tables and views, so the seeded products, stock, receipts, deliveries, transfers, adjustments, warehouses and ledger movements appear automatically after Refresh Data.
