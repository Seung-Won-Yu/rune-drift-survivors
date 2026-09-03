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
- Each completed seal receives a dedicated circuit signal that states the connected seal and earned reward without stacking another objective panel.
- Three honest run outcomes: full circuit seal, five-minute survival with an incomplete circuit, and defeat.
- Circuit-led run phases, wave pacing, surges, field items, elites, bosses, and boss rage patterns.
- Each five-minute run-phase change receives one restrained central signal and a distinct procedural audio cue.
- Contact attacks use approach, readable anticipation, impact snap, and recovery states with visible reach/countdown rings.
- The opening curve reaches its first card sooner and exposes the first three circuit seals by 145 seconds without changing late-run scaling.
- Guided replay routes continue into the early draft after the first seal, and an available synergy partner receives a protected card slot before unrelated weapon families.
- Combat signals use distinct shapes: warm open rings for danger, filled pulses for player attacks, and diamond marks for rewards and circuit objectives.
- Projectile pierce is spent on distinct targets, while orbit-blade collision matches its rendered ground-plane footprint and periodically sweeps nearby targets during objective travel.
- Storm and chain upgrades retain their crowd-control identity with bounded simultaneous-hit budgets, while runners use a short predictive line and a phase-bounded approach boost to create dodgeable early/mid-run pressure.
- A quality-independent simulation budget keeps enemy, projectile, and XP rules identical across devices.
- Adaptive visual budgets protect optional effects, numbers, and render cadence without changing combat difficulty.

### Presentation and controls

- Dark rune-field HUD with anchored HP/XP, timer, circuit navigation, objective, threat, boss, upgrade, pause, and result states.
- Player hits receive a restrained edge vignette, an HP-first alert, and a compact mobile layout that temporarily yields lower-priority guidance.
- The result screen ranks the top three damage sources by share and DPS, then summarizes damage taken, actual healing, and the run's most dangerous phase.
- A hand-painted 2.5D Rune Warden with 24 authored direction/action cells: two-frame idle and walk cycles plus cast and hurt poses in all four directions.
- A complete 2.5D animated Riftborn cast: runner, golem, brute, bulwark, charger, summoner, and the Rift Warden boss.
- Lossless WebP atlases and shared clean-edge sprite compositing reduce character transfer size while removing pale source fringes.
- Lightweight generated alpha materials give projectiles, runner afterimages, and storm fields soft game-like motion without Blender or downloaded VFX textures.
- Procedural Web Audio cues with browser-safe unlock and persisted mute state.
- Keyboard, mobile joystick, touch dash, portrait, and landscape support.
- Forest-ruin arena with multi-scale procedural PBR terrain, code-built foliage and ruins, coherent lit materials, and contact shadows.
- Code-built Rune Circuit gates, seal-colored rank stones, and ground routes keep the four gameplay landmarks readable with no Blender or GLB runtime dependency.

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

Run the three-route five-minute balance sampler in the background:

```bash
npm run qa:balance
```

The suite covers loading, keyboard/touch movement, dash buffering, audio, opening progression and phase transitions, Rune Circuit states and landmark structure, enemy contact timing and pose response, HUD/overlays, synergy-aware upgrade selection, boss state, result damage and survival summaries, desktop stress budgets, and mobile stress-frame overflow/HUD separation. The balance sampler also records damage by run phase, damage taken, and actual healing.

Useful deterministic routes include:

```txt
?qa=circuit&quality=balanced
?qa=phase&quality=balanced
?qa=objectives&quality=balanced
?qa=starter-upgrade&quality=balanced
?qa=contact&quality=balanced
?qa=combat&quality=balanced
?qa=threats&quality=balanced
?qa=stress&quality=balanced
?qa=victory&quality=balanced
?qa=survived&quality=balanced
```

See [docs/qa.md](./docs/qa.md) for the complete route table, browser expectations, and generated artifact locations.

## Render quality

The default mode automatically resolves to the balanced web target. Pause the game to switch between Auto, Performance, Balanced, and Quality; the choice persists locally. URL flags remain available for deterministic QA and override the in-game selector.

```txt
?quality=low
?quality=balanced
?quality=high
?quality=high&fx=on
?quality=cinematic
```

- `low` prioritizes mobile and reduced-motion stability.
- `balanced` is the normal gameplay target and keeps the full runtime model-free.
- `high` keeps the same coherent battlefield composition while enhancing lighting, shadows, atmosphere, and effect detail without adding model downloads.
- `fx=on`, `env=on`, and `cinematic` lazy-load more expensive presentation layers.
- Quality changes affect presentation only. Enemy density, projectile limits, and XP reward limits remain the same.

## Repository structure

```txt
src/
  audio/      semantic audio cues and Web Audio engine
  config/     asset manifest, tuning, metadata, upgrades
  hooks/      React-owned runtime lifecycle
  qa/         deterministic development scenes
  styles/     tokens, shell, screen-scoped HUD/overlay modules, responsive rules
  systems/    frame-level gameplay logic and feature-scoped runtime modules
  ui/         DOM HUD, overlays, cards, touch controls
  world/      React Three Fiber battlefield and effects
public/sprites/ project-authored RGB sprite atlases with runtime clean-edge compositing
scripts/        Playwright QA
docs/           project, QA, asset, and design documentation
```

All runtime modules under `src/` are connected to the `src/main.jsx` import graph. Generated output, browser artifacts, and raw asset downloads are git-ignored.

Stable facade files such as `gameState.js`, `runProgress.js`, `weaponRuntime.js`, `EnemyEffects.jsx`, and `FieldItemsAndShrines.jsx` preserve existing imports. Their implementations live in responsibility-scoped subfolders so future gameplay and presentation changes do not collect in a single file.

See [docs/project-structure.md](./docs/project-structure.md) for ownership boundaries and the full repository map.

## Assets

Only the project-authored atlases under `public/sprites/` ship as external visual assets. Characters use 2.5D sprites; terrain, landmarks, foliage, weapons, and effects are assembled in Three.js code.

- Active runtime manifest: `src/config/assets.js`
- Attribution: [ASSET_CREDITS.md](./ASSET_CREDITS.md)
- Inventory and runtime rules: [docs/assets.md](./docs/assets.md)

## Deployment

`.github/workflows/deploy.yml` builds, runs the headless smoke suite, and deploys `dist/` to GitHub Pages on pushes to `main`.

The production build uses `import.meta.env.BASE_URL`, so sprite atlases load correctly from the `/rune-drift-survivors/` Pages subpath.

## Documentation

- [Project structure](./docs/project-structure.md)
- [QA guide](./docs/qa.md)
- [Asset pipeline and sources](./docs/assets.md)
- [Visual reboot design records](./docs/design/rune-visual-reboot/)
- [Gameplay reframe and Rune Circuit](./docs/design/gameplay-reframe/)
- [Material-first visual foundation](./docs/design/gameplay-reframe/VISUAL_FOUNDATION.md)
- [Balance pass 02: saturation and pursuit](./docs/design/gameplay-reframe/BALANCE_PASS_02.md)
- [Balance pass 03: opening pressure and hit feedback](./docs/design/gameplay-reframe/BALANCE_PASS_03.md)
