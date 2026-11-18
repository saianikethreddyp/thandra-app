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
