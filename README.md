# ScreenGremlin

ScreenGremlin is a tiny desktop companion that wanders over your apps, hides at screen edges, talks back when you catch it, and stays out of the way when you work.

## Product status

This repository contains the full v1 MVP:

- Transparent always-on-top desktop overlay
- Click-through behavior on Windows and macOS
- Multi-monitor support
- Wander, peek, nap, taunt, zoom, and caught states
- Tray menu with pause/resume, settings, startup, and quit controls
- Global pause shortcut: `Ctrl/Cmd + Shift + G`
- Persistent local settings
- Free and Pro modes
- Offline cryptographically signed Pro licenses
- Windows, macOS, and Linux packaging
- Landing page
- GitHub Actions CI, packaging, release, and Pages workflows
- No account system and no analytics SDK

## Run the app locally

Requirements: Node.js 22+.

```bash
npm install
npm run desktop
```

To preview all Pro controls in development:

```bash
SCREEN_GREMLIN_DEV_PRO=1 npm run desktop
```

On Windows PowerShell:

```powershell
$env:SCREEN_GREMLIN_DEV_PRO="1"
npm run desktop
```

## Build installers

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Build output is written to `release/`.

## Configure sales

Before selling Pro, edit `electron/product-config.cjs` and add your live checkout URL.

The web landing page reads `VITE_CHECKOUT_URL`. For GitHub Pages, create a repository Actions variable named `VITE_CHECKOUT_URL`.

License keys are signed offline. The public key is embedded in the app; the private key must never be committed to this repository.

See [`docs/SELLING.md`](docs/SELLING.md) for license generation and launch steps.

## Quality checks

```bash
npm run check
```

CI also performs an Electron Builder smoke package on Linux.

## Privacy

ScreenGremlin does not include analytics, telemetry, ad SDKs, or an account system. Settings and the Pro license are stored locally in the Electron user-data directory.

See [`PRIVACY.md`](PRIVACY.md).
