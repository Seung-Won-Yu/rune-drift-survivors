# Balance Pass 03 — Opening pressure and hit feedback

## Purpose

Remove the universally damage-free opening without changing raw enemy damage or making contact unavoidable. Improve the visual and accessible response when a hit does occur, especially at the 360 × 740 mobile target.

## Evidence before tuning

The Balance Pass 02 default sample recorded no incoming damage in `learn`, `anchor`, or `armory` for any guided route. All 23–35 recorded damage occurred during `synergy` or `final`, so the first 145 seconds rarely exercised contact telegraphs, dash decisions, healing, or hit feedback.

## Changes

1. Apply a runner-only approach-speed scale of 1.14, 1.34, 1.50, 1.34, and 1.20 across the five time bands.
2. Leave player speed, contact reach, attack windup, recovery, raw damage, target counts, and simulation limits unchanged.
3. Put hit notices before crisis and dash notices, use the shared danger-red tone, and report damage as `-N HP`.
4. Fade a restrained peripheral vignette over the existing 0.62-second hit state and respect reduced-motion preferences.
5. Hide lower-priority guidance during that brief response and attach the mobile hit row to the vitals panel.

## 145-second diagnostic

| Route | Time | Circuit | HP | Damage taken | Healing | DPS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Storm + chain | 145s | 2/4 | 120/120 | 0 | 0 | 520.5 |
| Blade + nova | 145s | 2/4 | 120/120 | 6 | 6 | 234.1 |
| Orb + pierce | 145s | 2/4 | 100/120 | 26 | 5 | 337.9 |

The diagnostic produced small opening contact and a visible life-seal recovery without causing a defeat or blocking circuit travel.

## Five-minute result

| Route | Result | DPS | KOs | Level | Circuit | Final HP | Damage taken | Healing |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Storm + chain | Victory | 829.5 | 1,774 | 22 | 4/4 | 92/120 | 32 | 3 |
| Blade + nova | Victory | 741.0 | 1,374 | 20 | 4/4 | 140/140 | 0 | 0 |
| Orb + pierce | Victory | 822.9 | 1,425 | 20 | 4/4 | 140/140 | 0 | 0 |

All routes won and remained inside a compact final DPS band. Because the fixed random seed does not fix browser frame ordering, the route receiving a hit varies between samples; this is preferable to scripted or unavoidable damage.

## Decision

Keep the runner curve and stop this tuning pass. Future pressure changes should begin with approach geometry and additional multi-seed evidence, not raw damage or shorter telegraphs.

## Verification

- `npm run build`: 691 modules transformed; main game chunk 236.54 kB (70.54 kB gzip).
- `npm run qa:smoke`: 44/44 passed in background mode.
- `npm run qa:balance`: three victories and three complete circuits in 5.2 minutes.
- Desktop and 360 × 740 post-impact captures show the hit row, readable health delta, restrained vignette, and unobstructed controls.
- The Codex in-app browser loaded the deterministic contact route in the background; no external browser was opened or focused.
