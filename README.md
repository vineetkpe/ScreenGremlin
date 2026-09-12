# ScreenGremlin

ScreenGremlin is a small desktop companion designed to be understandable in seconds and easy to demo in short-form video.

## Build strategy

We are shipping this in small verified steps rather than building the full product at once.

### Step 1 — Core interaction prototype
- React + TypeScript + Vite foundation
- One on-screen Gremlin
- Wandering movement
- Click reactions

### Step 2 — Character behavior
- Wander, peek, taunt, and caught states
- Escalating poke reactions
- Mischief notices and facial animation

### Step 3 — Desktop overlay
- Electron desktop runtime
- Transparent frameless overlay
- Always-on-top Gremlin
- Mouse passthrough outside the Gremlin on supported platforms
- Safe preload bridge with context isolation

See `DESKTOP.md` for local desktop run instructions.

### Later steps
1. Add tray controls and a clean quit/pause flow
2. Add multi-monitor support and user settings
3. Package and test installable builds
4. Add a simple paid unlock only after the desktop experience is reliable
5. Add landing page, checkout, analytics, and launch assets

## Development

Each stage lives on its own feature branch and is verified before the next stage starts.
