# Project map

- `src/main.tsx` — application shell, authentication UI, dashboard and feature screens.
- `src/lib/supabase.ts` — Supabase client and environment handling.
- `src/lib/db.ts` — the only data-access/mapping layer; all persistence goes through the existing Supabase project.
- `src/types/index.ts` — shared domain types.
- `src/lib/format.ts` — display formatting helpers.
- `src/styles.css` — minimal responsive UI system.
- `SCHEMA_CONTRACT.md` — exact table/field contract assumed by the frontend.
- `COMMIT_PLAN.md` — 24 suggested commits, 6 per member.
- `SAMPLE_CHECKLIST.md` — final integration and viva/sample test list.
