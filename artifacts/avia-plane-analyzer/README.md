# Avia Plane Screen Analyzer

An Android-only, on-device tool that automatically searches the central game screen for large multiplier readings. It includes local history, correction, statistics, and CSV export. A manual scan area is available for layouts that place the current multiplier elsewhere. It does not predict outcomes or place bets.

## Android installation

The Replit preview is for the app interface. Screen capture and OCR require the custom Android native module in `modules/avia-screen-reader`; Expo Go and the browser preview cannot access them.

From the workspace root:

```sh
pnpm install
pnpm --filter @workspace/avia-plane-analyzer exec expo prebuild --platform android
cd artifacts/avia-plane-analyzer/android
./gradlew assembleDebug
```

The debug APK is created at:

```text
artifacts/avia-plane-analyzer/android/app/build/outputs/apk/debug/app-debug.apk
```

Open `artifacts/avia-plane-analyzer/android` in Android Studio to sync Gradle and run the app on a connected Android phone. To install the debug APK from a connected device using ADB:

```sh
adb install app/build/outputs/apk/debug/app-debug.apk
```

For a release Android App Bundle, configure a signing key locally in Android Studio (do not commit the keystore), then run `./gradlew bundleRelease` from the generated `android` folder. The bundle is written to `app/build/outputs/bundle/release/`.

## First use

1. Open a game with its current multiplier visible. Automatic scanning looks for a large central value marked `x`; small history-table values are ignored. If the game places the multiplier elsewhere, use **Adjust scan area**.
2. Tap **Start monitoring** and approve Android's screen-capture prompt. Android asks for this each time monitoring starts. Keep the current multiplier unobstructed; a history overlay covering it is intentionally not treated as a completed round.
3. Keep the capture notification visible while the game is open. Use the app or its notification to stop monitoring.
4. Review saved rounds, correct a misread result, and export a CSV from History.

OCR samples are cropped to the automatic or selected area, processed on the device, and discarded; screenshot frames are not saved or uploaded. The reader prioritizes large text near the screen center and does not finalize a round merely because an overlay hides the multiplier. Round values are saved locally. Granting screen-capture access is separate from enabling the app's optional historical-pattern indicator.

## Workspace preview and checks

```sh
pnpm --filter @workspace/avia-plane-analyzer run dev
pnpm --filter @workspace/avia-plane-analyzer run typecheck
```

The preview can verify the interface, settings, and local app flows, but live screen reading must be tested in a custom Android build on a real device.
