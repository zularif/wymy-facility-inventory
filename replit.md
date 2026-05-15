# Inventory OS

A role-based inventory management system for tracking stock, movements, alerts, reports, and rack labels.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, exposed at `/api`)
- `pnpm --filter @workspace/inventory run dev` — run the frontend (port 18174, exposed at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Session-based (`express-session` + `connect-pg-simple` + `bcryptjs`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind + shadcn/ui + Wouter routing
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (items, stock_movements, profiles, audit_log, user_sessions)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for the API contract)
- `lib/api-client-react/src/generated/` — generated React Query hooks and Zod schemas (don't edit manually)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — `requireAuth`, `requireRole` middleware
- `artifacts/inventory/src/pages/` — all frontend pages
- `artifacts/inventory/src/lib/auth.tsx` — auth context + `useAuth()` hook
- `artifacts/inventory/src/components/layout/app-layout.tsx` — sidebar layout

## Architecture decisions

- **Session-based auth over JWT/Clerk**: Clerk OIDC setup failed in this Replit environment; custom bcrypt + pg-session is simpler and self-contained.
- **`connect-pg-simple` schemaFile fix**: In dev mode (tsx), `__dirname` resolves incorrectly for connect-pg-simple's internal `table.sql`. Resolved by using `createRequire` to resolve the package path explicitly.
- **`req.session.save()` before response**: Session writes to Postgres are async; explicitly awaiting `save()` ensures the cookie is valid before the response reaches the client.
- **Wouter `<Redirect>` for auth guards**: Calling `setLocation` during render causes a React hooks count mismatch error. All guards use `<Redirect>` components instead.
- **`movement_date` stored as text**: Simplifies cross-timezone date handling for now; format is `YYYY-MM-DD`.

## Product

- **Login**: Session-based, role-gated access
- **Dashboard**: Summary cards (total items, stock value, low stock alerts, recent movements)
- **Item Master**: CRUD + Excel import/export + QR code display
- **Stock In / Stock Out**: Movement recording forms with reference numbers
- **Stock Movements**: Full movement history with filters
- **Current Balance**: Per-item current stock level
- **Low Stock Alerts**: Items below minimum stock threshold
- **Reports**: Movement summary reports with date range filters
- **Rack Labels**: PDF export with QR codes via jsPDF
- **Audit Log**: Admin-only full audit trail
- **User Management**: Admin-only CRUD for user profiles

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Do NOT run `pnpm dev` at workspace root** — run workflows individually as shown above.
- **Session table**: `user_sessions` is managed by `connect-pg-simple`; the table SQL file path must be resolved via `createRequire` (see `app.ts`) when running in tsx dev mode.
- **Codegen must run after OpenAPI spec changes**: `pnpm --filter @workspace/api-spec run codegen` — otherwise generated hooks and schemas will be stale.
- **Passwords**: Sample users use bcrypt hashes. To reset a password, generate a new hash via `bcrypt.hash(plaintext, 10)` in Node and UPDATE the `profiles` table directly.

## Sample Users

| Email | Password | Role |
|---|---|---|
| admin@inventory.com | Admin@1234 | admin |
| storekeeper@inventory.com | Store@1234 | storekeeper |
| technician@inventory.com | Tech@1234 | technician |
| viewer@inventory.com | View@1234 | viewer |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
