# QA guide

## Automated smoke suite

Run the production-oriented browser checks with:

```bash
npm run qa:smoke
```

Smoke tests run fully in the background by default. Set `RUNE_QA_HEADED=1` only when an explicit standalone Chrome window is wanted for debugging.

Use Node.js 22 and run `npm ci` first. Local runs use an installed Google Chrome. If Chrome is unavailable, install Playwright Chromium with `npx playwright install chromium`, then run `CI=true npm run qa:smoke`; this uses the CI behavior/budget checks and does not enforce the local real-time FPS threshold. Linux CI installs browser system dependencies with `npx playwright install --with-deps chromium`.

The suite currently contains 86 cases. In addition to gameplay coverage, it checks transparent surroundings and retained artwork in all 80 player/enemy atlas cells, opening upgrade comparisons, armory build continuity, detour collection/expiry, and compact navigation/low-health layouts. Character captures cover low/balanced/high at 360×740 plus balanced at 320×568, 568×320, and 740×360.

The suite covers themed loading and its progress semantics, zero-GLB startup in every quality tier, Rune Warden and complete Riftborn sprite delivery, hero and enemy four-direction selection, idle/walk timing, cast/hurt priority, desktop movement, buffered dash input, pointer/keyboard/assistive-click dash feedback, audio unlock and mute persistence, the opening XP curve, run-phase signals, and first three seal timings, Rune Circuit locked/ready, activation, and encounter-pressure states, four distinct code-built biome/landmark identities, semantic live objectives and current-phase pause objectives, dialog naming/focus containment, two-step restart confirmation, HP/XP/run/boss progress semantics, encounter/objective/boss HUD exclusivity, boss-notice deduplication, sealed/survived/defeat outcome rules, priority-preserving combat-effect budgets, late-threat intensity, enemy contact windup/recovery, reach-ring convergence, and anticipation/impact pose response, phase-bounded runner pressure, HP-first hit feedback, all five weapon damage sources, result damage contribution and survival records, mobile touch controls, pause/resume, quality selection and persistence, quality-independent simulation limits, desktop and 360 × 740 upgrade-card selection/overflow, boss HUD, guided replay restart, desktop stress budgets, and 320 × 568 / 360 × 740 mobile HUD-overlap guards.

Screenshots and local failure artifacts are generated under `output/playwright/` and `test-results/`. Both folders are ignored by git.

`qa-smoke-loading.png` captures the Rune Circuit entry state. `qa-smoke-objectives.png` guards the live objective rail, while `qa-smoke-compact-mobile.png` and `qa-smoke-compact-mobile-boss.png` guard the 320 × 568 base and boss frames. `qa-smoke-threat-telegraphs.png` captures the late charge and boss-shockwave hierarchy, and `qa-smoke-contact-windup.png` captures the contact countdown before impact. `qa-smoke-contact-hit.png` and `qa-smoke-mobile-hit.png` capture the post-impact HUD state. Damage feedback temporarily occupies the XP row inside the vitals panel while preserving the health gauge and navigation position. `qa-low-health-*` covers this at 320×568, 568×320, and 1440×900; `qa-cast-*` records the character/quality matrix. Short portrait screens place guidance above the sticks so the central character remains visible.

The README uses curated copies of the desktop HUD and compact mobile captures under `docs/images/`. Update those copies when shipping a visible presentation change; the full generated artifact directories remain ignored.

## Balance sampler

Run three guided build routes against the live five-minute game loop with a fixed random seed:

```bash
npm run qa:balance
```

The sampler runs headlessly, follows the active Rune Circuit, selects route-focused upgrades, tracks the live orbit radius for the blade route, and writes per-source and per-phase damage, per-phase damage taken and healing, progression, survival, circuit, and frame data to `output/playwright/balance-samples.json`.

Short or single-route diagnostics are available without changing production time:

```bash
RUNE_BALANCE_SECONDS=60 npm run qa:balance
RUNE_BALANCE_ROUTE=blade-nova RUNE_BALANCE_SECONDS=60 npm run qa:balance
RUNE_BALANCE_SEED=12345 npm run qa:balance
```

Supported route filters are `storm-chain`, `blade-nova`, and `orb-pierce`. Short, filtered, and non-default-seed runs receive suffixed artifact names so they cannot overwrite the complete default-seed baseline.

## Deterministic development scenes

Start the app with `npm run dev`, then use one of these routes:

| Route | Purpose |
| --- | --- |
| `?qa=circuit&quality=balanced` | Playable first-seal state, route HUD, armory landmark, biome, and curved ground route |
| `?qa=seal&quality=balanced` | First-seal completion signal, reward copy, and competing-HUD suppression |
| `?qa=phase&quality=balanced` | Run-phase transition signal and competing-HUD suppression |
| `?qa=objectives&quality=balanced` | Mid-run phase objectives, fourth-seal reward, and pause continuity |
| `?qa=upgrade&quality=balanced` | Late-run three-card upgrade layout |
| `?qa=starter-upgrade&quality=balanced` | First upgrade pacing and copy |
| `?qa=contact&quality=balanced` | Enemy contact windup, hit, and recovery |
| `?qa=combat&quality=balanced` | Live five-weapon cadence, hit-shape, and damage-source comparison |
| `?qa=threats&quality=balanced` | Bulwark, charger, summoner, and boss comparison with charge, beam, and late shockwave telegraphs |
| `?qa=stress&quality=balanced` | Runtime caps, combat-signal density, mobile HUD separation, and frame metrics |
| `?qa=silhouette&quality=balanced` | Dense Rune Warden and Riftborn role-silhouette comparison |
| `?qa=victory&quality=balanced` | Victory result overlay |
| `?qa=survived&quality=balanced` | Five-minute survival with an incomplete circuit |
| `?qa=defeat&quality=balanced` | Defeat result overlay |

Development builds also expose `window.__RUNE_DRIFT_QA__` for circuit, phase, boss, result, upgrade, combat identity, stress, contact-attack, reset, and metrics controls.

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
- CI runs use bundled Chromium and software WebGL, so they verify behavior and budgets without enforcing the local FPS threshold. Quality invariance is covered separately; runtime-sensitive checks use the low presentation tier, wait for observable game state instead of assuming wall-clock frame throughput, and use a minimal stress-frame sample.
- Every pushed change intended for `main` should pass `npm run build` and `npm run qa:smoke`.
- Physical iOS and Android checks remain necessary before release for browser chrome, touch latency, audio latency, and safe-area behavior.

### Scene readiness and rendering samples

Await scene commands such as `await window.__RUNE_DRIFT_QA__.reset()` before inspecting the new world. A superseded command resolves `false`; a committed command resolves `true`. URL fixtures expose `ready()` for the same boundary. Restart confirmation stays armed while focused and is cancelled by blur or Escape.

Paused and result screens render on demand. The stress fixture explicitly keeps continuous frames. Its startup frame metrics are attached to the Playwright result before `beginFrameSample()` starts the steady rendering measurement, whose FPS and severe-frame assertions remain unchanged.

CI runtime-dependent detour and low-health checks use the same Performance quality already used for movement/contact tests. Local runs retain Balanced quality. The separate authored-art checks still cover Low, Balanced, and High; no HUD/layout assertion or simulation budget changes with this choice. This avoids forcing GPU-heavy Balanced 3D rendering on a CPU-only runner while waiting for gameplay time.
