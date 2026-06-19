# Rune Drift Survivors

3D browser survivors game prototype built with React, Three.js, React Three Fiber, and Vite.

Play:

```txt
https://seung-won-yu.github.io/rune-drift-survivors/
```

## Game

Rune Drift Survivors is a short 5-minute auto-combat roguelite run.

You move through a rune ruin field, dodge pressure, collect XP, claim field items, choose upgrades, form weapon synergies, fight elites and bosses, then review your run result.

## Current Features

- 3D open-field arena with terrain, blockers, ruins, trees, rocks, and rune lighting.
- First-run onboarding for movement, dash, XP pickup, and armory cache.
- Wave pacing with combat rhythm phases and escalating threat.
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
- Run result summary with grade, top DPS weapon, preferred build, shrine rewards, elite kills, and boss kills.
- Mobile HUD and modal layout pass.
- Runtime caps for enemies, projectiles, XP gems, damage numbers, and effects.

## Controls

| Action | Input |
| --- | --- |
| Move | `WASD` or arrow keys |
| Dash | `Space` |
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
index.html
package.json
package-lock.json
vite.config.js
src/
public/models/
.github/workflows/deploy.yml
```

The tracked `public/models/` files are the runtime GLB assets loaded by the game.

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

- `npm run build` passes.
- GitHub Pages build mode passes with `GITHUB_PAGES=true npm run build`.
- Mobile 390x844 HUD, pause, upgrade, boss, result, and stress screens verified.
- Stress scenario verified with enemies, projectiles, XP gems, and effects near runtime caps.
- Console errors and warnings were checked during Playwright smoke tests.

## Asset Notes

Source and license notes live in:

```txt
assets/references/asset-sources.md
```

The game uses compatible/free asset sources plus local Blender-authored runtime GLB outputs.
