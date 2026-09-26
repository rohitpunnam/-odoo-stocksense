# 4-member GitHub Commit Plan

Use one branch per member. Do not make one giant commit. Each commit below should compile before the next one.

## Member 1 — Foundation, Auth & Dashboard
Branch: `feature/member-1-foundation`
1. `feat(auth): add Supabase client and environment configuration`
2. `feat(auth): add login signup and recovery OTP flow`
3. `feat(ui): add application shell sidebar header and responsive layout`
4. `feat(dashboard): add inventory KPI cards and operational filters`
5. `feat(dashboard): connect KPI queries to Supabase data`
6. `test(ui): add loading empty and error states across foundation screens`

## Member 2 — Products & Warehouse
Branch: `feature/member-2-products`
1. `feat(products): add product list search and category filters`
2. `feat(products): add create product form and validation`
3. `feat(products): add edit product and reorder-level controls`
4. `feat(warehouse): add warehouse management screen`
5. `feat(stock): add location stock availability and low-stock badges`
6. `refactor(products): centralize product warehouse and category data access`

## Member 3 — Stock Operations
Branch: `feature/member-3-operations`
1. `feat(receipts): add incoming receipt creation flow`
2. `feat(receipts): validate receipts and increase stock`
3. `feat(deliveries): add delivery order creation flow`
4. `feat(deliveries): validate deliveries with insufficient-stock protection`
5. `feat(transfers): add internal transfer workflow and location updates`
6. `feat(adjustments): add physical count adjustment and ledger logging`

## Member 4 — Ledger, Profile, Settings & QA
Branch: `feature/member-4-ledger`
1. `feat(ledger): add searchable stock movement history`
2. `feat(alerts): add low-stock and out-of-stock alert panel`
3. `feat(profile): add profile editing and logout flow`
4. `feat(settings): add warehouse/category settings polish`
5. `test(integration): verify CRUD validation and navigation flows`
6. `docs(release): add environment setup schema mapping and sample checklist`

## Integration order
1. Merge Member 1 into `main`.
2. Merge Member 2.
3. Merge Member 3.
4. Merge Member 4.
5. Run `npm run build` and perform the sample checklist before the final push/tag.

## Commit discipline
- Pull/rebase `main` before starting each commit.
- Keep each commit focused on one feature.
- Never commit `.env` or a Supabase service-role key.
- Push after every commit so contribution history is visible in GitHub.

## UI / Feature Refresh (v1.2)

The v1.2 refresh introduces a complete visual redesign and additional client-side features without replacing the existing Supabase database.

Suggested follow-up commits after the original member branches are merged:

### Member 1 — shell and interaction polish
```bash
git commit -m "feat(ui): redesign application shell with teal-indigo visual system"
git commit -m "feat(search): add command palette with keyboard shortcut"
```

### Member 2 — catalog and inventory visibility
```bash
git commit -m "feat(products): add product health indicators and catalog summary"
git commit -m "feat(ui): add responsive catalog table and stock visuals"
```

### Member 3 — operations usability
```bash
git commit -m "feat(ui): improve inventory operation forms and workflow states"
git commit -m "feat(dashboard): add quick actions for stock operations"
```

### Member 4 — reporting and alerts
```bash
git commit -m "feat(alerts): add low-stock attention center"
git commit -m "feat(reports): add inventory summary and CSV exports"
```

These are incremental v1.2 commits; the original six-commit-per-member plan remains the base collaboration plan.


## OTP authentication update

Member 1 should use an additional commit for the login verification flow:
`feat(auth): add email and phone OTP login verification`

The OTP flow is passwordless and uses Supabase Auth. The UI also preserves password login as an alternate option.
