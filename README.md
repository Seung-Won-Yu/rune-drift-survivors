# Rune Drift Survivors

<p align="center">
  <strong>3D vampire-survivors-like auto-combat roguelite built for the web.</strong>
</p>

<p align="center">
  <a href="https://Seung-Won-Yu.github.io/rune-drift-survivors/"><strong>Play on GitHub Pages</strong></a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=flat-square">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.181-black?style=flat-square">
  <img alt="React Three Fiber" src="https://img.shields.io/badge/React%20Three%20Fiber-9.4-73fbd3?style=flat-square">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7.3-646cff?style=flat-square">
  <img alt="GitHub Pages" src="https://img.shields.io/badge/Deploy-GitHub%20Pages-ffdf6e?style=flat-square">
</p>

## Overview

Rune Drift Survivors is a browser-playable 3D survivors-like prototype inspired by games such as Vampire Survivors and Megabonk.

The current slice focuses on a fast 5-minute run: move through a wide rune ruin field, survive enemy waves, collect XP, pick upgrades, evolve weapons, and use field items at the right moment.

## Live Build

Play the GitHub Pages build here:

```txt
https://Seung-Won-Yu.github.io/rune-drift-survivors/
```

If the link is not active yet, push this project to a GitHub repository named `rune-drift-survivors` and enable GitHub Pages with `GitHub Actions` as the source. The included workflow publishes every push to `main`.

## Features

- 3D auto-combat loop built with React Three Fiber and Three.js.
- 5-minute survivor run structure with escalating waves.
- Multiple weapon families: rune orb, storm brand, orbit blade, chain lightning, and solar nova.
- Level-up choices with build focus and visual weapon progression.
- Field items such as magnet, purge, heal, overload, and armory cache.
- Dash with cooldown and short invulnerability.
- Open-field ruin map with cliffs, blockers, relic landmarks, trees, rocks, and rune lighting.
- Enemy roles for normal mobs, runners, brutes, elites, and boss-style threats.
- Rune-stone HUD, level-up cards, and result screen styling.

## Controls

| Action | Key |
| --- | --- |
| Move | `WASD` or arrow keys |
| Dash | `Space` |
| Restart | `↻` button |

## Tech Stack

| Area | Tools |
| --- | --- |
| App | React 19, Vite |
| 3D | Three.js, React Three Fiber, Drei |
| Effects | React Three Postprocessing |
| Assets | GLB models, Blender source files, CC0/compatible asset packs |
| Deployment | GitHub Actions, GitHub Pages |

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build a production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## GitHub Pages Deployment

This repository includes `.github/workflows/deploy.yml`.

To publish the game:

1. Create a GitHub repository named `rune-drift-survivors`.
2. Push this project to the `main` branch.
3. Open the repository on GitHub.
4. Go to `Settings` -> `Pages`.
5. Set `Source` to `GitHub Actions`.
6. Wait for the `Deploy web game` workflow to finish.

The game will be available at:

```txt
https://Seung-Won-Yu.github.io/rune-drift-survivors/
```

If you rename the repository, the deployed path changes to:

```txt
https://Seung-Won-Yu.github.io/<repository-name>/
```

## Project Structure

```txt
rune-drift-survivors/
├─ .github/workflows/       # GitHub Pages deployment workflow
├─ assets/                  # Blender sources, references, and source asset notes
├─ docs/                    # Project structure and internal documentation
├─ public/models/           # Runtime GLB assets loaded by the game
├─ scripts/                 # Asset conversion and Blender generation scripts
├─ src/
│  ├─ config/assets.js      # Runtime asset manifest
│  ├─ main.jsx              # Game loop, combat, map, entities, and HUD
│  └─ styles.css            # Shell, HUD, modal, and game UI styling
├─ index.html
├─ package.json
└─ vite.config.js
```

## Asset Pipeline

The project uses a mix of downloaded CC0-compatible model packs and local Blender-authored assets.

Useful asset commands:

```bash
npm run assets:gltf-to-glb
```

Primary source notes live in:

```txt
assets/references/asset-sources.md
```

The rune drifter character can be regenerated from Blender:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --factory-startup --background --python scripts/blender/create_rune_drifter.py
```

## Current Direction

The prototype is being developed toward a high-quality 3D survivors-like:

- wider open-field maps with meaningful terrain height and blockers,
- clearer monster hierarchy and wave identity,
- stronger weapon evolution feedback,
- more readable pickups and XP flow,
- higher-grade rune ruin art direction,
- more satisfying 5-minute run pacing.

## Credits

This project uses and reshapes free/compatible game assets as source material.

- Quaternius model packs
- Kenney game asset packs
- Local Blender-authored edits and generated GLB outputs

See `assets/references/asset-sources.md` for the working source list and licensing notes.
