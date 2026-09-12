# Desktop overlay prototype

Step 3 adds an Electron runtime around the existing ScreenGremlin React app.

## Run it locally

```bash
npm install
npm run desktop
```

`npm run desktop` builds the frontend and launches a transparent, always-on-top overlay on the primary display.

While the pointer is not over the Gremlin, supported platforms pass mouse clicks through to the app underneath. Hovering the Gremlin temporarily makes the overlay interactive so it can be clicked.

During this prototype step, stop the app from the terminal with `Ctrl+C`.

## Not included yet

- Installer or signed executable
- System tray controls
- Auto-start
- Multi-monitor placement
- Persisted settings
- Payments or licensing
