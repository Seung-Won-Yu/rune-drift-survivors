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
- First-run onboarding for movement, dash, XP pickup, and armory cache.
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
- Pause, upgrade, and result overlays.
- Upgrade cards prioritize recommended picks and show short current-phase reasons.
- Run result summary with grade, top DPS weapon, preferred build, shrine rewards, elite kills, and boss kills.
- Mobile HUD and modal layout pass.
- Runtime caps for enemies, projectiles, XP gems, damage numbers, and effects.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD`, arrow keys, or mobile joystick |
| Dash | `Space` or mobile dash button |
| Pause | `P`, `Esc`, or pause button |
| Restart | restart button |

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
- GitHub Actions deploy passes on `main`.
- GitHub Pages build mode uses `GITHUB_PAGES=true npm run build`.
- Mobile HUD, upgrade cards, boss, result, and stress views have dedicated QA entry points in the app.
- Runtime caps are in place for enemies, projectiles, XP gems, damage numbers, and effects.

## Asset Notes

Source and license notes live in:

```txt
assets/references/asset-sources.md
```

The game uses compatible/free asset sources plus local Blender-authored runtime GLB outputs.
