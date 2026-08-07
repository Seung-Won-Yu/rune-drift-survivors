# Enemy telegraph pass 01

Status: implemented and verified
Date: 2026-08-07

## Goal

Replace unreadable instant contact damage with a visible melee sequence while preserving the existing enemy damage values and pressure scaling.

## Runtime contract

Every contact attack now moves through four readable states:

```txt
approach -> windup -> resolve -> recovery
```

- `enemyContactRuntime.js` owns kind-specific windup, recovery, reach, and movement-lock profiles.
- Enemy update code requests a contact-state update instead of applying overlap damage directly.
- Movement slows during windup and recovery, so an enemy cannot slide through the player while attacking.
- Damage resolves only when the player remains inside the displayed reach at the end of the windup.
- Existing damage values, run-pressure multipliers, player guard reduction, and invulnerability rules remain unchanged.
- Knockback can move an enemy outside its shown reach and turn the attack into a miss.

## Player feedback

- The outer ring shows the attack's full reach.
- The inner ring expands through the windup and shifts toward the danger color.
- Enemy poses compress and lean forward before the hit, then rebound on impact.
- A throttled semantic `enemy-attack` audio cue reinforces the warning without coupling combat code to an audio asset.
- Bosses, elites, and brutes receive longer, larger tells than runners.

## QA support

- `window.__RUNE_DRIFT_QA__.contactAttack()` creates one durable brute inside a controlled attack distance.
- `?qa=contact&quality=balanced` opens the same deterministic scenario.
- Runtime metrics expose active windups, recoveries, resolved attacks, and successful hits.

## Verification

- Production build: pass.
- Full system-Chrome smoke suite: 11/11 pass.
- Full CI-bundled-Chromium smoke suite: 11/11 pass.
- Deterministic windup -> hit -> recovery test: pass.
- Existing keyboard, touch, dash buffer, audio, HUD, upgrade, boss, result, and stress checks: pass.
- Telegraph screenshot visually inspected at 1440 x 900.

## Next combat pass

1. Add directional or cone attacks to the brute and selected elites.
2. Give enemy families distinct impact effects and authored animation timing.
3. Tune contact cadence after a full five-minute hands-on run.
4. Add physical-device checks for warning visibility and audio latency.
