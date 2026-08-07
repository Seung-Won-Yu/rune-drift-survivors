# Rune Drift Survivors

3D browser survivors game prototype built with React, Three.js, React Three Fiber, and Vite.

Play:

```txt
https://seung-won-yu.github.io/rune-drift-survivors/
```

## Game

Rune Drift Survivors is a short 5-minute auto-combat roguelite run.

You move through a rune ruin field, dodge pressure, collect XP, claim field items, choose upgrades, form weapon synergies, fight elites and bosses, then review your run result.

Run flow:

```txt
Learn movement -> Anchor basic growth -> Pick an armory direction -> Complete synergies -> Survive the final surge
```

## Current Features

- 3D forest-ruin arena with terrain, blockers, imported tree clusters, rocks, shrines, and rune lighting.
- Balanced mode now uses imported forest props, natural field accents, clearer perimeter groves, richer grove-floor patches, leaf/root decals, and darker terrain colors for better map read.
- First-run onboarding for movement, dash, XP pickup, and armory cache.
- Early upgrade pacing starts with rune orb, growth, and survival picks; new weapon families open through an armory cache, shrine, or later run timing.
- Wave pacing with combat rhythm phases and escalating threat.
- Run phase goals for early, mid, and final survival direction.
- Auto-combat weapons:
  - rune orb
  - storm brand
  - orbit blade
  - chain lightning
  - solar nova
- Build synergies:
  - storm + lightning
  - blade + solar nova
  - rune orb + pierce
- Field items:
  - magnet
  - purge
  - heal
  - overload
  - armory cache
- Elite and boss encounters with alerts, boss HP bar, pattern state, and rage phase.
- Enemy contact attacks use approach, windup, hit, and recovery states with visible reach/countdown rings instead of instant overlap damage.
- Pause, upgrade, and result overlays.
- Upgrade choices use rune-tablet silhouettes, clear role/effect hierarchy, recommendation cues, and responsive mobile layout.
- Gameplay HUD uses the dark rune-field system with anchored HP/XP, a compact run timer, contextual objectives, and threat alerts.
- Unlock-safe procedural combat audio for weapon casts, dash, damage, defeats, level-up, upgrades, and elite/boss warnings, with a persisted mute control.
- Enemy classes use clearer silhouettes in balanced mode: runner, golem, brute, elite, and boss have stronger shape, scale, accent, and marker differences.
- Run result summary with grade, top DPS weapon, preferred build, shrine rewards, elite kills, and boss kills.
- Mobile HUD and modal layout pass.
- Runtime caps plus adaptive combat budgets for enemies, projectiles, XP gems, damage numbers, and effects.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD`, arrow keys, or mobile joystick |
| Dash | `Space` or mobile dash button |
| Pause | `P`, `Esc`, or pause button |
| Restart | restart button |
| Sound | sound button |

## Performance Modes

The default render mode is `balanced` so the game keeps a crisp canvas while avoiding avoidable runtime churn.

Optional URL flags:

```txt
?quality=low
?quality=balanced
?quality=high
?quality=high&fx=on
?quality=cinematic
```

Notes:

- `balanced` keeps the normal arena detail and uses a capped but sharp DPR range.
- Runtime optimization focuses on lower object churn, squared-distance checks, post-effect opt-in, capped combat object counts, and adaptive budget pressure when frames get heavy.
- `low` is intended for mobile, high-DPI small screens, reduced-motion users, or hot laptops.
- Bloom, vignette, and the HDR environment are opt-in through `?fx=on`, `?env=on`, or `?quality=cinematic`.

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the local browser smoke suite:

```bash
npm run qa:smoke
```

This opens local Chrome so the stress FPS check matches the real browser path.

## GitHub Pages

Deployment is handled by `.github/workflows/deploy.yml`.

On every push to `main`, GitHub Actions runs:

```bash
npm ci
GITHUB_PAGES=true npm run build
```

Then it publishes `dist/` to GitHub Pages.

Important: model URLs use `import.meta.env.BASE_URL`, so the game works under the GitHub Pages subpath:

```txt
/rune-drift-survivors/
```

## Runtime Files

Files needed for the deployed game:

```txt
.github/workflows/deploy.yml
index.html
package.json
package-lock.json
vite.config.js
src/
public/models/
```

The tracked `public/models/` files are the runtime GLB assets loaded by the game.

Tracked support files:

```txt
ASSET_CREDITS.md
assets/references/asset-sources.md
docs/project-structure.md
scripts/
```

These files are not required by the browser at runtime, but they document asset sources and help rebuild model assets when needed. Imported third-party environment assets are documented in `ASSET_CREDITS.md`.

## Ignored Local Files

These are intentionally not committed:

```txt
node_modules/
dist/
.playwright-cli/
output/
.tools/
assets/source/
assets/archive/
assets/blender/*.blend
*.blend1
```

Blender source files can stay on the local machine, but the web game does not need them to run.

## QA Notes

Recent checks:

- `npm run build` passes locally.
- `npm run qa:smoke` runs loading, real keyboard/touch input, buffered dash, audio unlock/mute persistence, enemy contact windup/recovery, mobile pause, HUD, upgrade choices, boss HUD, result overlay, and stress-budget checks with Playwright/Chrome.
- GitHub Actions builds and publishes `main`; confirm the Pages deployment status after each push.
- GitHub Actions now runs the headless smoke suite before publishing the Pages artifact; real-time FPS remains a local system-Chrome check because CI uses software WebGL.
- GitHub Pages build mode uses `GITHUB_PAGES=true npm run build`.
- Mobile HUD, upgrade cards, enemy silhouette, contact telegraph, map, boss, result, and stress views have dedicated QA entry points in the app.
- Runtime caps and adaptive budget pressure are in place for enemies, projectiles, XP gems, damage numbers, and effects.
- Starter upgrade pacing was checked with `?quality=balanced&qa=starter-upgrade`; stress budget was checked with `?quality=balanced&qa=stress`.
- Contact attack timing can be checked deterministically with `?quality=balanced&qa=contact`.
- Stress QA exposes frame metrics through `window.__RUNE_DRIFT_QA__.metrics()`, including average FPS, EMA FPS, max frame time, slow frames, severe frames, object counts, and active runtime budgets.
- Compact HUD desktop/mobile screenshots were checked with Playwright after the casual HUD pass.
- Upgrade card desktop/mobile screenshots were checked with Playwright after the readability pass.
- Balanced map screenshots and stress metrics were checked after the ground-detail pass.
- Smoke screenshots are written under `output/playwright/`.

## Asset Notes

Source and license notes live in:

```txt
assets/references/asset-sources.md
```

The game uses compatible/free asset sources plus local Blender-authored runtime GLB outputs.
