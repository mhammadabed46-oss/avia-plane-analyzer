# Avia Plane Screen Analyzer

Android app that automatically reads large, centered multiplier rounds and provides on-device history, corrections, statistics, and CSV export.

## Run & Operate

- `pnpm --filter @workspace/avia-plane-analyzer run dev` — run the Expo interface preview
- `pnpm --filter @workspace/avia-plane-analyzer run typecheck` — typecheck the mobile app
- `pnpm --filter @workspace/avia-plane-analyzer exec expo prebuild --platform android` — generate the native Android project
- `cd artifacts/avia-plane-analyzer/android && ./gradlew assembleDebug` — build a debug APK
- See `artifacts/avia-plane-analyzer/README.md` for Android install and release AAB steps.

## Stack

- pnpm workspaces, Expo SDK 57, React Native 0.86, TypeScript
- Local persistence: AsyncStorage and Android SharedPreferences
- Android capture: MediaProjection foreground service with on-device Google ML Kit text recognition, focused on large centered multipliers marked with `x`
- No capture API or remote image storage is used by the app.

## Where things live

- Mobile app and custom Android native module: `artifacts/avia-plane-analyzer/`
- Product setup and Android build instructions: `artifacts/avia-plane-analyzer/README.md`
- Screen-capture events and round models: `artifacts/avia-plane-analyzer/lib/` and `artifacts/avia-plane-analyzer/modules/avia-screen-reader/`

## Architecture decisions

- Android MediaProjection permission is requested for each monitoring session; OCR defaults to an automatic central crop with a user-selected scan-area override.
- Round results are queued locally in Android so rounds detected while the app UI is backgrounded can be restored on return.

## Product

- Target layouts: the supplied Spaceman, Turbo Games Aero, and Aviator screens. Read the large current multiplier near the center; ignore small history-table values and wait if the current value is obscured.
- Live monitor with automatic Android screen reading, optional scan-area adjustment, pause/resume/stop controls, and local round saving.
- Analytics, searchable/correctable history, CSV sharing, and English/Arabic settings.
- The app is historical record-keeping only; it must not make predictions, place bets, or send screen captures off-device.

## User preferences

None specified.

## Gotchas

- Expo Go and the browser preview cannot perform Android screen capture. Test capture/OCR using a generated Android build on a real device.

## Pointers

- See `artifacts/avia-plane-analyzer/README.md` for build instructions and Android permission behavior.
