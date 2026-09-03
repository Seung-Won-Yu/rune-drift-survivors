# Project structure

## Repository map

```txt
.
├── src/                    Game runtime and presentation
│   ├── audio/              Semantic cues and Web Audio engine
│   ├── config/             Assets, tuning, upgrades, and metadata
│   ├── hooks/              React-owned runtime lifecycle
│   ├── qa/                 Deterministic development scenes
│   ├── styles/             Tokens, shell, screen-scoped HUD/overlays, responsive rules
│   ├── systems/            Frame-level gameplay logic and scoped runtime modules
│   ├── ui/                 DOM HUD, overlays, cards, touch controls
│   └── world/              React Three Fiber scene components
├── public/sprites/         Project-authored character atlases
├── scripts/                Browser QA tooling
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
- `src/systems/game-state/` separates normal game state from deterministic QA fixtures; `gameState.js` is the stable public facade.
- `src/systems/run-progress/` separates onboarding/objectives from score, defense, and result summaries; `runProgress.js` is the stable public facade.
- `src/systems/weapon-runtime/` owns one cast module per weapon family; `weaponRuntime.js` only coordinates shared timing and preserves the existing frame-loop contract.
- `src/world/GameWorld.jsx` composes the battlefield, actors, telegraphs, projectiles, and visual feedback.
- `src/world/enemy-effects/` separates shared actor accents, common-role decoration, elite/threat signals, and ground auras.
- `src/world/field-items/` separates collectible presentation from Rune Shrine rendering and initialization.
- `src/world/MapBaseArena.jsx` keeps low, balanced, and high on one terrain/landmark composition; quality tiers may change density, lighting, shadows, and effects but must not swap in a second battlefield.
- `src/ui/` owns accessible DOM presentation; it should not mutate scene refs directly.
- `src/styles/hud/` and `src/styles/overlays/` own screen-level CSS while the top-level `hud.css` and `overlays.css` files preserve cascade order through imports.

## Stable facade rule

Files already imported across the runtime remain thin facades when an implementation grows. New work should enter the responsibility-scoped module first, and the facade should only coordinate or re-export. This keeps call sites stable while preventing state, presentation, and weapon-specific changes from colliding in one file.

## Assets

- `src/config/assets.js` is the sprite manifest.
- `public/sprites/` contains the complete deployable visual-asset inventory.
- The runtime intentionally contains no Blender, glTF, GLB, or model-loader path.
- See [`assets.md`](./assets.md) for the active inventory and rendering rules.

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
```

## Design records

The visual reboot records live under [`docs/design/rune-visual-reboot/`](./design/rune-visual-reboot/). The active gameplay reframe, Rune Circuit experience map, and follow-up slices live under [`docs/design/gameplay-reframe/`](./design/gameplay-reframe/). These are design records rather than runtime dependencies.
