# QA guide

## Automated smoke suite

Run the production-oriented browser checks with:

```bash
npm run qa:smoke
```

Smoke tests run fully in the background by default. Set `RUNE_QA_HEADED=1` only when an explicit standalone Chrome window is wanted for debugging.

The suite covers loading, zero-GLB startup in every quality tier, Rune Warden and complete Riftborn sprite delivery, hero and enemy four-direction selection, idle/walk timing, cast/hurt priority, desktop movement, buffered dash input, audio unlock and mute persistence, the opening XP curve and first three seal timings, Rune Circuit locked/ready, activation, and encounter-pressure states, code-built landmark structure, current-phase pause objectives, encounter/objective/boss HUD exclusivity, sealed/survived/defeat outcome rules, enemy contact windup/recovery and anticipation/impact pose response, all five weapon damage sources, mobile touch controls, pause/resume, quality selection and persistence, quality-independent simulation limits, upgrade choices, boss HUD, guided replay restart, result state, desktop stress budgets, and a 360 × 740 mobile stress frame with overflow and HUD-overlap guards.

Screenshots and local failure artifacts are generated under `output/playwright/` and `test-results/`. Both folders are ignored by git.

## Deterministic development scenes

Start the app with `npm run dev`, then use one of these routes:

| Route | Purpose |
| --- | --- |
| `?qa=circuit&quality=balanced` | Playable first-seal state, route HUD, code-built gate, and ground route |
| `?qa=seal&quality=balanced` | First-seal completion signal, reward copy, and competing-HUD suppression |
| `?qa=objectives&quality=balanced` | Mid-run phase objectives, fourth-seal reward, and pause continuity |
| `?qa=upgrade&quality=balanced` | Late-run three-card upgrade layout |
| `?qa=starter-upgrade&quality=balanced` | First upgrade pacing and copy |
| `?qa=contact&quality=balanced` | Enemy contact windup, hit, and recovery |
| `?qa=combat&quality=balanced` | Live five-weapon cadence, hit-shape, and damage-source comparison |
| `?qa=threats&quality=balanced` | Bulwark, charger, summoner, and boss sprite-scale comparison |
| `?qa=stress&quality=balanced` | Runtime caps, combat-signal density, mobile HUD separation, and frame metrics |
| `?qa=silhouette&quality=balanced` | Dense Rune Warden and Riftborn role-silhouette comparison |
| `?qa=victory&quality=balanced` | Victory result overlay |
| `?qa=survived&quality=balanced` | Five-minute survival with an incomplete circuit |
| `?qa=defeat&quality=balanced` | Defeat result overlay |

Development builds also expose `window.__RUNE_DRIFT_QA__` for circuit, boss, result, upgrade, combat identity, stress, contact-attack, reset, and metrics controls.

For character-edge review, use `silhouette`, `combat`, and `threats` at the standard camera. Check for pale rectangular remnants or bright halos around the hood, weapons, horns, and boss crown. Intentional gold and pale-stone highlights inside the silhouettes must remain intact.

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
- `high` enables additional code-built world, lighting, and effect detail while remaining model-free.
- `fx=on`, `env=on`, and `cinematic` opt into the expensive presentation layers.
- URL quality flags lock the development scene to that mode. Without a flag, use the pause menu to select Auto, Performance, Balanced, or Quality.
- Render quality never changes enemy, projectile, or XP simulation limits.

## Local and CI expectations

- Local system-Chrome runs enforce the real-time stress FPS threshold.
- CI runs use bundled Chromium and software WebGL, so they verify behavior and budgets without enforcing the local FPS threshold.
- Every pushed change intended for `main` should pass `npm run build` and `npm run qa:smoke`.
- Physical iOS and Android checks remain necessary before release for browser chrome, touch latency, audio latency, and safe-area behavior.
