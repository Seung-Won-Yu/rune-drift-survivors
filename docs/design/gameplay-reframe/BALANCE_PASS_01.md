# Balance Pass 01 — Live-loop baseline

## Purpose

Measure the existing five-minute combat loop before changing raw weapon multipliers. The sampler uses the same runtime, spawn director, collisions, progression, and result rules as normal play; only movement and card selection are automated.

## Full baseline

Fixed seed: `0x5eed2026`

| Route | Result | DPS | KOs | Level | Circuit | Bosses | Route damage share |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Storm + chain | Victory | 1,226.9 | 2,066 | 23 | 4/4 | 3 | 87% |
| Blade + nova | Victory | 756.4 | 1,404 | 21 | 4/4 | 3 | 17% |
| Orb + pierce | Victory | 1,316.0 | 2,212 | 23 | 4/4 | 3 | 14% |

The values above are the diagnostic baseline captured before the projectile repeat-hit and replay-draft corrections. They remain useful as evidence for why those contracts changed, but they are not the new tuning target.

## Findings and corrections

1. Storm projectiles could spend all pierce charges on one enemy across consecutive frames. Projectiles now remember distinct targets.
2. Orbit blades collided as zero-size points using full 3D distance even though their rendered blades are long and ground-aligned. Collision now uses the shared visual size on the XZ plane.
3. A guided replay family was granted at the first armory seal, but levels 2–7 still forced orb cards. Once unlocked, the replay family now owns that early weapon slot.
4. The initial melee bot continued to kite like a ranged build and could skip blade cards while waiting for an unavailable nova card. Its movement and available-card selection now reflect the route.

## Post-correction checkpoint

The 60-second comparison after distinct-target piercing produced 162.8 DPS for storm-chain, 109.2 DPS for blade-nova, and 148.4 DPS for orb-pierce. The storm route was 77% aligned with storm and lightning; the blade route remained only 6% aligned.

After the replay-draft and sampler-card fixes, the blade route reached blade focus V, nova focus I, and orb focus II by 60 seconds instead of orb IV and blade I. Its blade-nova damage share remained about 7%, isolating the next investigation to near-range weapon behavior rather than draft identity.

## Decision

Do not apply a blanket damage multiplier. Two post-correction five-minute seeds produced:

| Seed | Route | DPS | KOs | Route share | Damage taken | Healing |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `0x5eed2026` | Storm + chain | 1,012.0 | 1,937 | 79% | 0 | 0 |
| `0x5eed2026` | Blade + nova | 541.9 | 1,189 | 28% | 24 | 0 |
| `0x5eed2026` | Orb + pierce | 719.7 | 1,265 | 24% | 33 | 0 |
| `439041101` | Storm + chain | 940.5 | 1,795 | 84% | 31 | 31 |
| `439041101` | Blade + nova | 677.7 | 1,241 | 30% | 49 | 0 |
| `439041101` | Orb + pierce | 885.9 | 1,509 | 67% | 0 | 0 |

All six runs completed the four-seal circuit and won. The phase buckets showed that blade routes lost contribution while traversing between seals, and their early draft filled before the available nova synergy card could enter. The fix therefore targets behavior and route continuity rather than raw multipliers:

1. Record per-phase damage, post-mitigation damage taken, and actual healing.
2. Use one blade-orbit radius for rendering, collision, and QA positioning.
3. Reserve an early card slot for the selected family's available synergy partner.
4. Give orbit blades a bounded mid-range sweep while retaining the close orbit as their defensive layer.

The post-change 60-second comparison measured storm-chain at 179.1 DPS, blade-nova at 107.0 DPS, and orb-pierce at 104.7 DPS. A focused blade sample split its damage into 32% blade, 25% nova, and 43% starter orb, compared with 1–3% blade contribution in the pre-sweep full runs.

## Commands

```bash
npm run qa:balance
RUNE_BALANCE_ROUTE=blade-nova RUNE_BALANCE_SECONDS=60 npm run qa:balance
RUNE_BALANCE_SEED=12345 npm run qa:balance
```

JSON and screenshots are written under `output/playwright/` and remain ignored by Git.
