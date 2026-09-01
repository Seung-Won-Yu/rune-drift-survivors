# Rune Drift Survivors

Rune Drift Survivors is a five-minute 3D browser auto-combat roguelite built with React, Three.js, React Three Fiber, and Vite.

Play the GitHub Pages build: [seung-won-yu.github.io/rune-drift-survivors](https://seung-won-yu.github.io/rune-drift-survivors/)

## Core loop

```txt
Learn movement → follow the active seal → ignite the four-step Rune Circuit
→ complete weapon synergies → survive bosses and the final rift
```

Move through a dark rune-ruin battlefield, collect XP, and follow the next seal's direction and timing. Each circuit activation grants a build or survival reward while redirecting the run across the arena. Draft upgrades, build weapon synergies, read enemy attack telegraphs, and survive until the five-minute result screen.

## Current build

### Combat and progression

- Auto-combat weapons: rune orb, storm brand, orbit blade, chain lightning, and solar nova.
- Synergy paths: storm + lightning, blade + nova, and orb + pierce.
- First-run guidance for movement, dash, XP collection, and the first circuit seal.
- A four-step Rune Circuit with sequential activation, timed unlocks, navigation, and distinct rewards.
- Circuit-led run phases, wave pacing, surges, field items, elites, bosses, and boss rage patterns.
- Contact attacks use approach, windup, resolve, and recovery states with visible reach/countdown rings.
- Runtime caps and adaptive budgets protect enemy, projectile, XP, number, and effect counts.

### Presentation and controls

- Dark rune-field HUD with anchored HP/XP, timer, circuit navigation, objective, threat, boss, upgrade, pause, and result states.
- Distinct runner, golem, brute, elite, and boss silhouettes across render-quality modes.
- Procedural Web Audio cues with browser-safe unlock and persisted mute state.
- Keyboard, mobile joystick, touch dash, portrait, and landscape support.
- Forest-ruin arena with a procedural PBR terrain surface, coherent lit materials, contact shadows, and selectively reused CC0 props.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD`, arrow keys, or mobile joystick |
| Dash | `Space` or mobile dash button |
| Pause | `P`, `Esc`, or pause button |
| Restart | HUD restart button |
| Sound | HUD sound button |

## Quick start

Requires Node.js 22 or a compatible current LTS release.

```bash
npm ci
npm run dev
```

The development server prints the local URL. Production and preview commands are:

```bash
npm run build
npm run preview
```

## QA

Run the complete browser smoke suite:

```bash
npm run qa:smoke
```

The suite covers loading, keyboard/touch movement, dash buffering, audio, Rune Circuit states, enemy contact timing, HUD/overlays, upgrade selection, boss state, result state, and stress budgets.

Useful deterministic routes include:

```txt
?qa=circuit&quality=balanced
?qa=starter-upgrade&quality=balanced
?qa=contact&quality=balanced
?qa=combat&quality=balanced
?qa=stress&quality=balanced
?qa=victory&quality=balanced
```

See [docs/qa.md](./docs/qa.md) for the complete route table, browser expectations, and generated artifact locations.

## Render quality

The default mode is `balanced`.

```txt
?quality=low
?quality=balanced
?quality=high
?quality=high&fx=on
?quality=cinematic
```

- `low` prioritizes mobile and reduced-motion stability.
- `balanced` is the normal gameplay target and avoids the multi-megabyte high-detail forest payload.
- `high` enables imported actor models and additional battlefield detail on demand.
- `fx=on`, `env=on`, and `cinematic` lazy-load more expensive presentation layers.

## Repository structure

```txt
src/
  audio/      semantic audio cues and Web Audio engine
  config/     asset manifest, tuning, metadata, upgrades
  hooks/      React-owned runtime lifecycle
  qa/         deterministic development scenes
  styles/     tokens, shell, HUD, overlays, responsive rules
  systems/    frame-level gameplay logic
  ui/         DOM HUD, overlays, cards, touch controls
  world/      React Three Fiber battlefield and effects
public/models/  runtime GLB assets
scripts/        Playwright QA and model conversion
docs/           project, QA, asset, and design documentation
```

All runtime modules under `src/` are connected to the `src/main.jsx` import graph. Generated output, browser artifacts, raw asset downloads, archives, and Blender working files are git-ignored.

See [docs/project-structure.md](./docs/project-structure.md) for ownership boundaries and the full repository map.

## Assets

Only browser-ready assets under `public/models/` ship with the game. Raw downloads and editable sources stay in ignored local folders under `assets/`.

- Active runtime manifest: `src/config/assets.js`
- Attribution: [ASSET_CREDITS.md](./ASSET_CREDITS.md)
- Inventory and conversion workflow: [docs/assets.md](./docs/assets.md)

Rebuild archived character/combat glTF sources with:

```bash
npm run assets:gltf-to-glb
```

## Deployment

`.github/workflows/deploy.yml` builds, runs the headless smoke suite, and deploys `dist/` to GitHub Pages on pushes to `main`.

The production build uses `import.meta.env.BASE_URL`, so models load correctly from the `/rune-drift-survivors/` Pages subpath.

## Documentation

- [Project structure](./docs/project-structure.md)
- [QA guide](./docs/qa.md)
- [Asset pipeline and sources](./docs/assets.md)
- [Visual reboot design records](./docs/design/rune-visual-reboot/)
- [Gameplay reframe and Rune Circuit](./docs/design/gameplay-reframe/)
- [Material-first visual foundation](./docs/design/gameplay-reframe/VISUAL_FOUNDATION.md)
