# Balance Pass 02 — Saturation and pursuit

## Purpose

Correct the two structural outliers left after route continuity and blade traversal work: fully upgraded storm-chain saturation and runners that only followed the player's previous position. Preserve base damage multipliers and validate the result on the real five-minute loop.

## Pre-change reference

| Route | Result | DPS | KOs | Route share | Damage taken |
| --- | --- | ---: | ---: | ---: | ---: |
| Storm + chain | Victory | 1,442.7 | 2,305 | 98% | 31 |
| Blade + nova | Victory | 586.6 | 1,247 | 29% | 39 |
| Orb + pierce | Victory | 636.0 | 1,320 | 48% | 31 |

The storm route reached six concurrent strikes and up to fourteen chain targets at minimum cooldowns. The last chain could also receive a negative multiplier from the linear falloff expression. Incoming damage was absent through most of the first two minutes and clustered in the synergy or final phases.

## Changes

1. Limit storm casts to five strikes, five distinct targets per field, and a 0.48-second minimum interval.
2. Limit chain lightning to ten targets, a 0.38-second minimum interval, and a positive 28% damage floor.
3. Let runners aim a short distance along current player velocity, capped at 3.2 meters. Contact distance and telegraph timing remain unchanged.
4. Record incoming damage and healing by run phase in both the development snapshot and sampler output.

## Post-change result

| Route | Result | DPS | KOs | Level | Circuit | Final HP | Damage taken |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Storm + chain | Victory | 728.5 | 1,530 | 21 | 4/4 | 109/140 | 32 |
| Blade + nova | Victory | 695.8 | 1,340 | 20 | 4/4 | 97/120 | 23 |
| Orb + pierce | Victory | 846.1 | 1,456 | 21 | 4/4 | 105/140 | 35 |

The three builds now finish within a comparable damage, progression, and survival band. Storm keeps its earlier crowd-control lead, but the gap converges during the final phase instead of compounding. Runner prediction improves pursuit geometry without making damage unavoidable for a player who keeps moving and dashing.

## Decision

No further multiplier changes in this pass. Repeat the multi-seed sampler before any future raw-damage adjustment, and use the phase defense buckets to separate opening feel from late-run danger.

## Verification

- `npm run build`: 691 modules transformed; main game chunk 235.12 kB (70.14 kB gzip).
- `npm run qa:smoke`: 41/41 passed in background mode.
- The balanced Codex in-app combat scene and 360 × 740 stress capture retain clean sprite edges, distinct combat signals, and separated HUD regions.
