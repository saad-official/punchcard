# Punchcard — product and technical spec

Date: 2026-10-05. Status: approved design for v0.1 (batch 4, app 10 of the Vibe Build Series).

## 1. Problem and users

Solo tradespeople and 1–5 person crews (plumbers, electricians, cleaners, landscapers, handypeople) bill by the hour per client or job and reconstruct their week from memory. Manual tracking loses roughly one billable hour in five; incumbents (ClockShark $40/mo + $9/user on 3-year contracts, QuickBooks Time $20/mo + $8/user) are priced and shaped for payroll departments. Consumer "shift" apps show a Live Activity timer but have no clients, jobs, crews or invoice-ready exports.

**Punchcard** is a phone-first job clock: tap once to start a job, see it running on the Lock Screen / Dynamic Island (iOS) or as an Android 16 Live Update, get nudged when you forget to stop, and export a client-ready timesheet.

Success for v0.1: a tradesperson can track a full week across three clients without opening the app more than to tap start/stop, and send a PDF timesheet from the share sheet. The portfolio goal is a native-feeling Expo app that exercises Live Activities, Live Updates, widgets, notifications, geofencing, haptics, Liquid Glass and a RevenueCat subscription.

## 2. Scope (v0.1)

In scope:
- Clients (name, colour, hourly rate, optional site address + geofence radius) and optional per-client jobs.
- Clock in / switch job / break / clock out; running entry survives app kill (derived from timestamps).
- Live Activity (iOS 16.2+) and Android 16 Live Update for the running entry: elapsed, client colour, earnings so far, Stop and Break actions. Fallback: ongoing notification on Android < 16.
- Widgets: iOS small/medium + Lock Screen circular; Android 2×1 and 4×2. Content: today's total, current job, tap to open; "start last job" button where the platform allows.
- Nudges: local "still clocked in after 10 h"; Pro geofence exit while clocked in; backend Monday 07:00 weekly summary push (if signed in).
- Timesheet: day and week views, edit entries (with audit note), notes + photos, mileage.
- Exports: weekly PDF and CSV via share sheet. Pro: client-branded PDF, unlimited history, geofences, multi-device sync.
- Plans via RevenueCat Test Store: Free (3 clients, 30-day history, basic PDF) / Pro ($6.99/mo, $49.99/yr).
- Optional account (Better Auth) for sync + push; local-only works forever.
- Landing site (getpunchcard.vercel.app) with pricing, privacy, support, FAQ.

Out of scope for v0.1: crews with manager approval, invoicing/payments, payroll integrations, Apple Watch, APNs push-to-update of Live Activities, real App Store / Play products (Test Store only), tablets.

## 3. Architecture

```
punchcard/
  apps/mobile      Expo SDK 57, expo-router, local-first SQLite (Drizzle), native surfaces
  apps/web         Next.js 16: marketing site + API (Better Auth, sync, push, RevenueCat webhook, cron)
  packages/shared  pure TS domain: time math, pay, week bucketing, plan limits, zod schemas, tokens
```

- **Local-first.** All entries live on-device in SQLite (`expo-sqlite` + `drizzle-orm/expo-sqlite`). The backend is optional and only mirrors data for sync/export/push. No feature requires network except sign-in, sync and the weekly push.
- **Domain in `packages/shared`.** Everything testable without a device: interval math (overlap, splitting at midnight, rounding to 1/6/15 min), pay calculation, week bucketing with locale start-of-week, plan gating, CSV row shaping, export models. Vitest, TDD.
- **Native surfaces behind adapters** in `apps/mobile/src/native/`: `live-status.ts` (iOS Live Activity via expo-widgets / Android Live Update via expo-live-updates / ongoing-notification fallback), `widgets.ts` (expo-widgets iOS + react-native-android-widget), `notifications.ts`, `geofence.ts`, `purchases.ts`. Screens call adapters, never libraries.

## 4. Data model

SQLite (device) — mirrored in Postgres schema `punchcard` for sync:

- `clients(id, name, color, hourly_rate_cents, currency, address, lat, lng, geofence_radius_m, archived_at, created_at, updated_at)`
- `jobs(id, client_id, name, archived_at, …)` — optional sub-label under a client.
- `entries(id, client_id, job_id?, started_at, ended_at?, break_seconds, note, mileage_km?, source: 'manual'|'geofence'|'widget'|'live_activity', edited_note?, created_at, updated_at, deleted_at?)` — exactly one row with `ended_at IS NULL` at a time (the running entry).
- `entry_photos(id, entry_id, local_uri, remote_url?, created_at)`
- `settings(key, value)` — rounding, start of week, currency, nudge hours, theme accent.
- `sync_state(table, last_pulled_at, dirty_ids)`.

IDs are UUIDv7 strings generated on device (`expo-crypto`), so sync is conflict-light: last-write-wins per row by `updated_at`, soft deletes.

Postgres adds `users` (Better Auth), `devices(user_id, expo_push_token, platform, last_seen_at)`, `entitlements(user_id, plan, source: 'revenuecat', expires_at, raw)`.

## 5. Mobile app

**Navigation (expo-router, NativeTabs).** Tabs: Clock · Timesheet · Clients · Reports · Settings. Modals/form sheets: new client, edit entry, paywall, export options. Onboarding stack shown once (`settings.onboarded`).

**Screens.**
- *Clock*: huge tabular timer, client chip with colour, earnings so far, primary Start/Stop button (Gesture.Tap + haptic), Break toggle, "switch job" sheet, today's entries list below. Idle state shows last three clients as quick-start cards.
- *Timesheet*: week strip (swipe), day list of entries grouped by client with durations and pay; long-press → context menu (edit, duplicate, delete). Edit form sheet.
- *Clients*: list with colour, rate, this-week hours; add/edit sheet with address search (geocode via `expo-location`), geofence radius slider (Pro).
- *Reports*: week/month totals per client, export buttons (PDF, CSV), "branded PDF" (Pro), history limit banner on Free.
- *Settings*: account (sign in / sync status), plan + Manage subscription (RevenueCat), rounding, week start, currency, nudges, notifications permission state, appearance (accent), about, privacy, support, export/delete data.
- *Onboarding* (3 screens): "Tap once, bill every hour" → "Your clock lives on the Lock Screen" (Live Activity mock) → "Timesheets your clients accept" → permission priming for notifications (location priming happens when the first geofence is set).

**Design system (`packages/shared/tokens.ts` + `apps/mobile/src/theme/`).** Identity: industrial. Charcoal surfaces (`#15171A` dark, warm paper `#F4F1EA` light), safety-orange accent (`#FF6A1A` light / `#FF7E3A` dark), steel grey secondaries, client colours from a fixed 10-swatch palette. Typography: SF Pro / Roboto for text, tabular-figure numerals for all timers and money (`fontVariant: ['tabular-nums']`), one display size for the clock. Radius 12/20, glass cards via `expo-glass-effect` on iOS 26 with `expo-blur` fallback. Follows the `expo-design-system` and `expo-native-ui` skills; no default-template look.

**Motion.** Reanimated 4 only: timer digits tick without layout jumps (fixed-width glyphs), Start→Stop morph, sheet transitions native, onboarding parallax, haptic `impactMedium` on clock-in, `notificationSuccess` on export.

**State.** Repositories over SQLite with a tiny subscription store (`useSyncExternalStore`); a `useRunningEntry()` hook recomputes elapsed every second from `started_at` (no interval drift, survives background). React Compiler on.

## 6. Native surfaces

- **Live Activity (iOS).** `createLiveActivity('RunningEntry', …)` in `src/widgets/running-entry.activity.tsx` ('widget' directive, `@expo/ui/swift-ui` only): banner shows client name + colour bar + `Text(timerInterval)` style elapsed + earnings; Dynamic Island compact = elapsed, expanded = client, elapsed, Stop/Break `Button`s (`target: 'stop'|'break'`). App mirrors button presses via `addUserInteractionListener`. Started on clock-in, updated on switch/break, ended on clock-out; `getInstances()` reconciles after relaunch.
- **Live Update (Android 16).** `startLiveUpdate({ title: client, text: 'Running · 1h 12m', progress: {indeterminate}, showTime: true, time: startedAt }, { deepLinkUrl: 'punchcard://clock' })`; refreshed each minute by a foreground timer while the app is alive, otherwise `showTime` renders the chronometer natively. Needs `POST_PROMOTED_NOTIFICATIONS` and compileSdk 36.1. Below Android 16: expo-notifications ongoing notification with the same text.
- **Widgets.** iOS `TodayWidget` (small/medium, Lock Screen circular) via expo-widgets `updateSnapshot` on every entry change. Android `TodayWidget` via react-native-android-widget with a task handler; data bridged through the widget store.
- **Notifications.** expo-notifications: category `running` (Stop / Add break), local "still clocked in" scheduled at clock-in +10 h and cancelled on clock-out; Expo Push token registered with the backend when signed in.
- **Geofence (Pro).** expo-location geofencing task (`expo-task-manager`) registered for clients with a radius; on exit while running → local notification "Left Smith kitchen — still on the clock?" with Stop action; on enter while idle → "Arrived at Smith kitchen — start?" with Start action. Requires "Always" permission; primed with an explanation screen.
- **Purchases.** react-native-purchases with the Test Store API key; `react-native-purchases-ui` paywall; entitlement `pro` cached locally; `plan` read through `usePlan()`; RevenueCat webhook mirrors to Postgres when a user is signed in (app user id = Better Auth user id, anonymous otherwise).

## 7. Backend (apps/web)

- Better Auth (email + password now; social later) with `@better-auth/expo` plugin, trusted origin `punchcard://`; Drizzle schema `punchcard`; PGlite in dev when `DATABASE_URL` is unset (same pattern as Firstreply).
- API routes under `app/api/`: `auth/[...all]`, `sync/push` (upsert dirty rows), `sync/pull?since=`, `devices` (register push token), `webhooks/revenuecat` (HMAC/Authorization header check, idempotent on event id), `cron/daily` (keep-alive + Monday weekly summary push via expo-server-sdk), `health`.
- Marketing: `(marketing)` route group — home, pricing, privacy, support, terms. Own identity (shared tokens → Tailwind theme).

## 8. Testing and verification

- `packages/shared`: Vitest unit tests for every exported function (TDD).
- `apps/web`: Vitest for sync merge rules, webhook verification, cron summary; `next build`; Playwright smoke later if time allows.
- `apps/mobile`: `tsc --noEmit`, `expo lint`, `expo-doctor`, `expo prebuild --clean` (Android) on Windows; device pass on an Android 16 phone (Live Update, widget, notification actions, dark mode, haptics); iOS pass on the owner's Mac per `docs/testing-on-mac.md`.
- Billing: Test Store purchase flips `pro`, gates open, webhook row appears in Postgres.

## 9. Risks

`expo-live-updates` is alpha (pinned, adapter + fallback). expo-widgets component surface is SwiftUI-only (keep widgets tiny). Monorepo hoisting with Metro (hoisted linker). EAS free quota (native changes batched, JS via EAS Update). Stores not live, so RevenueCat stays on Test Store and Vercel Hobby is non-commercial.
