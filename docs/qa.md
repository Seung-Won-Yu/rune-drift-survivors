# QA guide

## Automated smoke suite

Run the production-oriented browser checks with:

```bash
npm run qa:smoke
```

Smoke tests run fully in the background by default. Set `RUNE_QA_HEADED=1` only when an explicit standalone Chrome window is wanted for debugging.

The suite covers loading and balanced payload boundaries, desktop movement, buffered dash input, audio unlock and mute persistence, Rune Circuit locked/ready and encounter-pressure states, enemy contact windup/recovery, all five weapon damage sources, mobile touch controls, pause/resume, upgrade choices, boss HUD, guided replay restart, result state, and runtime stress budgets.

Screenshots and local failure artifacts are generated under `output/playwright/` and `test-results/`. Both folders are ignored by git.

## Deterministic development scenes

Start the app with `npm run dev`, then use one of these routes:

| Route | Purpose |
| --- | --- |
| `?qa=circuit&quality=balanced` | Playable first-seal state, route HUD, and world landmark |
| `?qa=upgrade&quality=balanced` | Late-run three-card upgrade layout |
| `?qa=starter-upgrade&quality=balanced` | First upgrade pacing and copy |
| `?qa=contact&quality=balanced` | Enemy contact windup, hit, and recovery |
| `?qa=combat&quality=balanced` | Live five-weapon cadence, hit-shape, and damage-source comparison |
| `?qa=stress&quality=balanced` | Runtime caps, effects load, and frame metrics |
| `?qa=silhouette&quality=balanced` | Dense enemy silhouette comparison |
| `?qa=victory&quality=balanced` | Victory result overlay |
| `?qa=defeat&quality=balanced` | Defeat result overlay |

Development builds also expose `window.__RUNE_DRIFT_QA__` for circuit, boss, result, upgrade, combat identity, stress, contact-attack, reset, and metrics controls.

## Render quality flags

```txt
?quality=low
?quality=balanced
?quality=high
?quality=high&fx=on
?quality=cinematic
```

- `balanced` is the default gameplay target.
- `low` is the mobile/reduced-motion fallback.
- `high` enables imported actor models and additional world detail.
- `fx=on`, `env=on`, and `cinematic` opt into the expensive presentation layers.

## Local and CI expectations

- Local system-Chrome runs enforce the real-time stress FPS threshold.
- CI runs use bundled Chromium and software WebGL, so they verify behavior and budgets without enforcing the local FPS threshold.
- Every pushed change intended for `main` should pass `npm run build` and `npm run qa:smoke`.
- Physical iOS and Android checks remain necessary before release for browser chrome, touch latency, audio latency, and safe-area behavior.
