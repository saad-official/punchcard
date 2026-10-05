# Punchcard web (`apps/web`)

Next.js 16 App Router: the marketing site (`app/(marketing)`) and the API the Expo app talks to (`app/api`). Deployed to Vercel with root directory `apps/web`.

```bash
pnpm dev            # http://localhost:3600 (PGlite in .pglite/ when DATABASE_URL is unset)
pnpm test           # Vitest, in-memory PGlite per test file
pnpm db:generate    # new migration in drizzle/ after editing lib/db/schema.ts
pnpm db:migrate     # apply drizzle/ to DATABASE_URL (or .pglite/)
pnpm tokens:css     # regenerate app/tokens.css from packages/shared/src/tokens.ts
```

## API

All bodies are JSON. "Session" means a Better Auth session: the Expo client (`@better-auth/expo`) sends `Cookie: punchcard.session_token=...`; anything else gets `401 {"error":"unauthorized"}`.

| Route | Auth | Purpose |
| --- | --- | --- |
| `/api/auth/*` | Better Auth | Email + password sign-up/sign-in, sessions, `POST /api/auth/delete-user` (cascades all server data) |
| `POST /api/sync/push` | Session | `SyncPushRequest` from `@punchcard/shared` -> `{ serverTime, accepted }`; last write wins on `rowVersion` |
| `GET /api/sync/pull?since=` | Session | Rows changed on the server after `since` -> `{ serverTime, tables }`; `serverTime` is the next `since` |
| `POST /api/devices` | Session | Register an Expo push token `{ token, platform }` |
| `DELETE /api/devices/:token` | Session | Unregister the caller's token |
| `GET /api/me/plan` | Session | `{ plan, expiresAt, source }` from the RevenueCat mirror |
| `POST /api/webhooks/revenuecat` | `Authorization: Bearer $REVENUECAT_WEBHOOK_SECRET` | Idempotent by event id; purchases/renewals grant Pro until expiry |
| `GET /api/cron/daily` | `Authorization: Bearer $CRON_SECRET` | Keep-alive query; Mondays send last week's summary push |
| `GET /api/health` | None | Liveness |

Merge and cursor rules are documented in `lib/sync/contract.ts`. Tables live in the `punchcard` Postgres schema (`lib/db/schema.ts`).
