# Thandra Cars (customer app)

Expo SDK 58, expo-router, TanStack Query. Talks to the Thandra API (`EXPO_PUBLIC_API_URL`, default: the Render deployment).

```
npm start          # dev server
npm run typecheck
npm test
```

Push notifications and `expo-updates` need a development or production build, not Expo Go:
`eas build --profile development --platform android`.

## Over-the-air (OTA) updates

JS and asset changes ship without a store release through EAS Update. Each build only receives updates for its
own **runtime version**, which is the `version` in `app.json` (`runtimeVersion.policy = appVersion`).

| Build profile | Channel | Publish with |
|---|---|---|
| development | development | `eas update --channel development --message "..."` |
| preview | preview | `npm run update:preview -- "what changed"` |
| production | production | `npm run update:production -- "what changed"` |

- The app checks on launch and whenever it returns to the foreground (at most every 10 minutes), downloads the update in
  the background, and shows a "A new version is ready · Restart" banner. It also applies on the next launch.
- Profile → footer shows `vX.Y.Z · <update id>` so you can tell which update a phone is running.
- **Bump `version` in `app.json` whenever native code changes** (new native package, new permission, Expo SDK upgrade, plugin
  change) and ship a new store build. Do not publish an OTA update for a native change: old binaries would get JS that
  needs native code they don't have. Keeping the version unchanged for JS-only fixes keeps OTA working.
- Roll back by publishing the previous commit again, or `eas update:rollback`.

First-time setup (once): `npx eas-cli login`, `npx eas-cli update:configure` (the project id and update URL are already in `app.json`).

## Store builds from GitHub

Actions → **release-build** → Run workflow. Choose `android` (builds the `.aab` for Google Play), `ios` (the `.ipa`
for App Store / TestFlight) or `all`. The files appear under the run's **Artifacts**. Tick *submit* to also upload to the
stores. It type-checks and runs the tests first, and builds on EAS, so no Mac or Android SDK is needed.

One-time setup:
1. Repository secret `EXPO_TOKEN` (expo.dev → Account settings → Access tokens).
2. Android: run `npx eas-cli build -p android --profile production` once on your computer so EAS can create the signing key
   (non-interactive CI cannot create it). Keep the key backed up in the EAS dashboard.
3. iOS: needs a paid Apple Developer account. Run `npx eas-cli build -p ios --profile production` once and sign in when asked,
   so EAS can create the certificate and provisioning profile.
4. For *submit*: add the Google Play service-account key (`eas credentials`) and the App Store Connect API key.
