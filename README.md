# Punchcard

A phone-first job clock for solo tradespeople and small crews (plumbers, electricians, cleaners, landscapers, handypeople). Tap once to start the clock on a client's job, see it running on the Lock Screen and Dynamic Island (iOS) or as an Android 16 Live Update, get nudged when you forget to stop, and send the client a PDF or CSV timesheet from the share sheet. Local-first: it works forever without an account; signing in adds sync between phones and a Monday summary push.

**Why it exists.** Hand-tracked hourly work loses roughly one billable hour in five, and the incumbents are priced for payroll departments (ClockShark $40/mo + $9/user, QuickBooks Time $20/mo + $8/user). Consumer shift apps have a Lock Screen timer but no clients, jobs or invoice-ready exports; Punchcard is Free for 3 clients and Pro at $6.99/mo or $49.99/yr.

Landing site: [getpunchcard.vercel.app](https://getpunchcard.vercel.app). Product and technical spec: [`docs/spec.md`](docs/spec.md).

## Monorepo layout

```
apps/mobile       Expo SDK 57 app (expo-router, local-first SQLite, Live Activities, widgets, RevenueCat)
apps/web          Next.js 16: marketing site + API (Better Auth, sync, Expo push, RevenueCat webhook, cron)
packages/shared   Pure TypeScript: time and pay math, weeks, reports, plan limits, zod schemas, sync merge, design tokens
docs/             Spec and device testing guides
```

pnpm 12 workspace with a hoisted `node_modules` (Metro needs it; see `.npmrc`). Node 24.

## Run it

```bash
pnpm install                 # from the repo root

# Web: landing site + API on http://localhost:3600
pnpm web                     # same as: pnpm --filter web dev
```

The web app needs no setup locally: without `DATABASE_URL` it runs an embedded Postgres (PGlite) in `apps/web/.pglite/`, migrated on first use, and a public development auth secret. Copy `apps/web/.env.example` to `apps/web/.env.local` to point at Neon or set real secrets; `bash apps/web/scripts/setup-env.sh` pushes production secrets to Vercel and runs migrations.

```bash
# Mobile: development build (Expo Go cannot load the native modules)
cd apps/mobile
npx expo run:android --device   # Android phone over USB
npx expo start                  # Metro for an installed dev build
```

Install Expo libraries with `npx expo install <pkg>` inside `apps/mobile`, never `pnpm add`.

## Checks

```bash
pnpm lint          # every workspace
pnpm typecheck
pnpm test          # Vitest: packages/shared domain, apps/web API against in-memory PGlite
pnpm build:web     # next build
```

CI (`.github/workflows/ci.yml`) runs the same four steps on every push to `main` and every pull request.

## Testing on a device

**Android over USB.** Turn on Developer options and USB debugging on the phone, plug it in, accept the RSA prompt, and check `adb devices` lists it. Then `cd apps/mobile && npx expo run:android --device`. Live Updates need Android 16; older versions fall back to an ongoing notification. To reach the local API from the phone, run `adb reverse tcp:3600 tcp:3600` so the app's `http://localhost:3600` resolves to your computer.

**iPhone (on a Mac).** Live Activities, the Dynamic Island and iOS widgets need Xcode and a real device or simulator; follow [`docs/testing-on-mac.md`](docs/testing-on-mac.md).

## Status (v0.1)

| Area | State |
| --- | --- |
| Shared domain (`packages/shared`): durations, rounding, pay, weeks, reports, plan limits, sync merge, schemas | Done, unit tested |
| Design tokens (`packages/shared/src/tokens.ts`) and web theme | Done |
| Web API: auth (Better Auth + Expo plugin), sync push/pull, devices, plan, RevenueCat webhook, daily cron with Monday summary push | Done, tested on PGlite |
| Marketing site: home, pricing, privacy, support, terms | Done |
| Mobile app screens, Live Activity, Live Update, widgets, geofences, paywall | In progress |
| TestFlight and Google Play betas | Not started (store buttons are placeholders) |
| Real App Store / Play products | Out of scope for v0.1 (RevenueCat Test Store) |
