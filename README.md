# ScreenGremlin

ScreenGremlin is being built as a small, highly visual desktop-style experience designed to be understandable in seconds and easy to demo in short-form video.

## Build strategy

We are shipping this in small verified steps rather than building the full product at once.

### Step 1 — Core interaction prototype
- Minimal React + TypeScript + Vite app
- One on-screen Gremlin character
- Character wanders around the viewport
- Clicking the Gremlin triggers a reaction
- No accounts, payments, backend, analytics, or installer yet

### Later steps
1. Refine the Gremlin interaction and visual identity
2. Add configurable behaviours/effects
3. Decide web vs desktop packaging based on the prototype
4. Add a simple paid unlock only after the core loop is worth paying for
5. Add landing page, checkout, analytics, and launch assets

## Development

Project setup is added incrementally on feature branches so each stage can be reviewed before the next one begins.
