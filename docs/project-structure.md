# Project structure

## Repository map

```txt
.
├── src/                    Game runtime and presentation
│   ├── audio/              Semantic cues and Web Audio engine
│   ├── config/             Assets, tuning, upgrades, and metadata
│   ├── hooks/              React-owned runtime lifecycle
│   ├── qa/                 Deterministic development scenes
│   ├── styles/             Tokens, shell, HUD, overlays, responsive rules
│   ├── systems/            Frame-level gameplay logic
│   ├── ui/                 DOM HUD, overlays, cards, touch controls
│   └── world/              React Three Fiber scene components
├── public/models/          Browser-ready GLB assets
├── scripts/                QA and model-conversion tooling
├── docs/                   Architecture, QA, assets, and design records
├── assets/                 Ignored local source/archive workspace
├── index.html              Vite document entry
└── vite.config.js          Build and chunk configuration
```

## Runtime ownership

- `src/main.jsx` owns root React state, Canvas configuration, the HUD, overlays, touch controls, visual quality, and game audio.
- `src/GameScene.jsx` owns frame-loop ordering and hands the active refs to `GameWorld`.
- `src/hooks/useGameSceneRuntime.js` creates/reset runtime refs, adaptive budgets, scratch objects, and QA metrics.
- `src/hooks/useGameSceneEffects.js` owns keyboard listeners, level-up effects, and the dev-only scene API.
- `src/systems/gameSceneActions.js` is the narrow adapter between the frame loop and gameplay systems.
- `src/systems/` keeps player, enemy, weapon, projectile, pickup, shrine, Rune Circuit, terrain, pacing, telemetry, and pool logic independent of React rendering.
- `src/world/GameWorld.jsx` composes the battlefield, actors, telegraphs, projectiles, and visual feedback.
- `src/ui/` owns accessible DOM presentation; it should not mutate scene refs directly.

## Assets

- `src/config/assets.js` is the runtime asset manifest and preload contract.
- `public/models/` contains only models loaded by the current build.
- `scripts/gltf-to-glb.mjs` converts archived glTF sources into runtime GLB files.
- See [`assets.md`](./assets.md) for the active inventory, sources, and local asset workflow.

## QA and generated files

- `scripts/playwright-smoke.config.mjs` configures local system Chrome and CI Chromium.
- `scripts/qa-smoke.spec.mjs` contains the browser regression suite.
- `src/qa/` contains deterministic scene setup and the development control API.
- See [`qa.md`](./qa.md) for routes and verification expectations.

These generated/local folders are ignored and must not be committed:

```txt
node_modules/
dist/
output/
test-results/
.playwright-cli/
.tools/
.agents/
assets/source/
assets/archive/
assets/blender/*.blend
```

## Design records

The visual reboot records live under [`docs/design/rune-visual-reboot/`](./design/rune-visual-reboot/). The active gameplay reframe, Rune Circuit experience map, and follow-up slices live under [`docs/design/gameplay-reframe/`](./design/gameplay-reframe/). These are design records rather than runtime dependencies.
