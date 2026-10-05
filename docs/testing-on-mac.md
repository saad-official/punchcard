# Testing Punchcard on a Mac (iOS)

The iOS-only surfaces (Live Activity, Dynamic Island, home/Lock Screen widgets, notification
actions) cannot be built on the Windows dev box. This is the owner's checklist for a Mac with
Xcode and an iPhone.

## What needs a paid Apple Developer account

| Feature | Free Apple ID (personal team) | Paid program ($99/yr) |
|---|---|---|
| App on your own iPhone via Xcode (7-day profile) | yes | yes |
| Live Activity / Dynamic Island | yes | yes |
| Local notifications with Stop / Break actions | yes | yes |
| Home/Lock Screen widget (`ExpoWidgetsTarget` uses the App Group `group.com.saadofficial.punchcard`) | **no** – App Groups need a paid team | yes |
| Push notifications (Expo push token, weekly summary) | no | yes |
| `eas build -p ios` (any profile), TestFlight | no | yes |
| Geofencing ("Always" location) | yes | yes |
| RevenueCat Test Store purchases | yes (debug build) | yes |

With a free team, temporarily remove the `expo-widgets` plugin entry from `apps/mobile/app.json`
(or expect the widget target to fail signing) to try everything else.

## One-time setup

1. Xcode 26+ from the App Store, then `xcode-select --install` and open Xcode once to install
   components. iPhone on iOS 17+ (Live Activities need 16.2+, the timer text 16+), with
   **Developer Mode** on (Settings → Privacy & Security).
2. Node 24 and pnpm 12: `brew install node@24 && corepack enable && corepack prepare pnpm@12.8.1 --activate`.
3. CocoaPods: `brew install cocoapods`.
4. In Xcode → Settings → Accounts, sign in with the Apple ID / team you will sign with. Add
   your Team ID to `apps/mobile/app.json` as `"ios": { "appleTeamId": "XXXXXXXXXX", ... }`
   (the widget extension target is signed with it).

## Build and run on the device

```sh
git clone <punchcard repo url> punchcard
cd punchcard
pnpm install
cd apps/mobile
echo "EXPO_PUBLIC_REVENUECAT_TEST_KEY=<Test Store key>" > .env.local   # optional: purchases
npx expo prebuild --platform ios                 # generates ios/ with the ExpoWidgetsTarget extension
npx expo run:ios --device                        # pick the iPhone; first build ~10 min
```

If signing fails, open `ios/Punchcard.xcworkspace`, select both the `Punchcard` and
`ExpoWidgetsTarget` targets → Signing & Capabilities → choose your team (keep "Automatically
manage signing"), then re-run `npx expo run:ios --device`. On first launch trust the developer
profile on the phone (Settings → General → VPN & Device Management).

After that, JS changes hot-reload from `npx expo start --dev-client`; re-run `expo run:ios`
only after native changes (new native package or `app.json` plugin changes). Widget and Live
Activity layouts are sent from JS at runtime, so editing their TSX usually needs no rebuild.

### Alternative: EAS cloud build (paid account)

```sh
npx eas-cli@latest login
npx eas-cli@latest init                          # writes extra.eas.projectId into app config
npx eas-cli@latest device:create                 # register the iPhone (ad hoc)
npx eas-cli@latest build -p ios --profile development
```

Install from the QR code / link EAS prints, then `npx expo start --dev-client`. EAS asks to
create the App Group and the widget extension's bundle id (`com.saadofficial.punchcard.widgets`)
on first build; accept. `eas build -p ios --profile preview` makes a standalone internal build
(note: RevenueCat Test Store keys only work in debug/dev-client builds).

## Test script

Seed data first: from a dev screen or the JS console call `seedDemoData()` (from `@/data`), or
create a client in the app.

### Live Activity and Dynamic Island
1. Allow notifications at the onboarding prompt (Settings → Punchcard → Live Activities must be on).
2. Start a job. Lock the phone: the banner shows the client colour bar, name, a ticking timer,
   earnings and Break / Stop buttons. On a Dynamic Island phone, go home: compact view shows
   the clock icon + timer; long-press the island for the expanded view.
3. Tap **Break**: timer freezes, label says "On break", button becomes **Resume**. Tap again to
   resume. Tap **Stop**: the activity ends and the entry is closed in the Timesheet.
4. Kill the app while a job runs, relaunch: the same activity is adopted (no duplicate) and the
   timer in the app matches the Lock Screen.
5. Check the timer keeps ticking with the app suspended for > 5 minutes (it is a native timer).

### Widgets (paid team)
1. Long-press the home screen → + → Punchcard → add **Today** small and medium; on the Lock
   Screen (Customize → Lock Screen → widgets) add the circular one.
2. While a job runs, the total ticks live; stop the job and the widget updates within a few
   seconds (the app pushes a snapshot on every change).
3. Medium widget idle state shows **Start <last client>**; tapping it opens
   `punchcard://clock?start=<id>` (the Clock screen starts that client).

### Notification actions
1. Settings → nudges: set "still clocked in" to a low value for testing (or temporarily
   `setSetting('nudgeAfterHours', 0.02)`, about 1 minute), start a job, lock the phone.
2. When "Still on the clock?" arrives, long-press it: **Stop** and **Break** actions. Each opens
   the app and applies the action (also works when the app was killed).
3. Geofence (Pro): give a client an address and radius, accept "Always" location, walk out of /
   into the radius (or use Xcode → Debug → Simulate Location on a GPX file). Expect "Left …"
   with **Stop** while running, "Arrived at …" with **Start** while idle.

### Purchases
Set `EXPO_PUBLIC_REVENUECAT_TEST_KEY` in `.env.local` (RevenueCat dashboard → project → API
keys → Test Store), rebuild the dev client, open the paywall from Settings and "buy" with the
Test Store sheet: `usePlan()` flips to `pro` and Pro gates open. Restore purchases should keep Pro.

## Troubleshooting

- **Widget shows "Unable to load"**: open the app once (the first snapshot is pushed on launch);
  check the App Group exists on both targets.
- **No Live Activity**: Settings → Punchcard → Live Activities; Low Power Mode can delay updates;
  the system allows a handful of concurrent activities per app.
- **Notification actions do nothing**: make sure the app was rebuilt after adding
  `expo-notifications`; actions are registered on launch (`setupNotifications`).
- **`pod install` errors after pulling**: `cd apps/mobile && npx expo prebuild --platform ios --clean`.
