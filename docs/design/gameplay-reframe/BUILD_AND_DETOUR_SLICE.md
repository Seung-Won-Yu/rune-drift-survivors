# Build continuity and an optional field detour

The player is a rune wanderer who shapes a weapon build while choosing a path between four seals. This slice gives automatic rewards a predictable relationship to that build and introduces one visible reason to leave the direct seal route.

## Playable rules

| Layer | Player experience |
| --- | --- |
| Moment | Move, avoid contact, and choose whether to approach a purple field rune. |
| Feedback | The existing world ring and beam are enlarged; a direction, distance, reward, and expiry appear below the HUD. |
| Reward | Collecting the rune grants the existing eight-second overload effect. |
| Choice | Take the side trip for a brief power spike, or continue toward the life seal. |
| Session | Complete the same four-seal, five-minute run. |
| Return | Replay with a different weapon route using the existing result flow. |

### Automatic weapon rewards

The first available armory reward still activates an unopened replay reservation. Subsequent rewards prefer the highest-focus family with an eligible candidate. If multiple families tie, the replay family wins when present; otherwise the tied candidates retain weighted selection. Family caps, individual card caps, stat caps, unlock gates, and per-cache exclusions are applied before preference. Once focused families have no eligible candidates, the existing fallback pool remains available.

Focus is the existing aggregate of manual and automatic upgrades, not a new record of the player's last manual choice. Manual level-up drafts retain new-family and synergy options so the player can redirect the build.

### Optional route reward

After the weapon seal and before the life seal, the existing `starter-overload` scheduled reward can appear early, about 20–23 world units away. It is placed 12 units toward the next seal and 16–20 units to the side, with arena and collider checks on the approach. If the player is already within 24 units of the next seal, or no clear placement exists, the original 76-second schedule remains available.

The relocated reward expires after 24 seconds of active simulation and attracts only within four units. It is recorded under the original schedule ID immediately upon spawning, so collecting or ignoring it never produces a second scheduled overload at 76 seconds. Ordinary random drops remain possible. No enemy count, permanent reward quantity, overload strength, or seal requirement was increased.

The optional cue replaces the routine objective panel while visible. Next-seal navigation stays visible. Damage, dash feedback, encounters, active threats, bosses, and pickup confirmations take precedence. The cue clears after pickup/expiry on the next normal HUD synchronization and ends when the life seal is completed. Restart clears both the runtime item and its HUD snapshot.

## Verification and interpretation

Focused checks cover reward-family preference, ties, cap/exclusion/unlock fallbacks, a clear detour approach, early/late scheduling, expiration, ignoring the reward, actual collection, and reset. Browser checks at 320×568, 768×1024, 740×360, and 1440×900 verify navigation and control separation. A keyboard-driven browser test follows the displayed direction and obtains the real eight-second effect.

Visual captures: `output/playwright/qa-detour-*.png`. The existing three-route balance sampler follows seal navigation rather than detours, providing a check that skipping the new opportunity does not block a run. It is not a measurement of player preference or enjoyment.

Verification on 2026-09-07: the production build passed and all 70 smoke checks passed in 1.6 minutes, including desktop/mobile stress checks. Independent review found no actionable issue in reward selection, scheduling, reset, snapshot synchronization, or direction calculation.

The five-minute sampler also passed (5.2 minutes wall time). All three routes reached `victory` with four seals, using seed `1592598566` at low quality. Raw evidence is in `output/playwright/balance-samples.json` (generated 2026-09-07 07:04 UTC).

| Route | End HP | Total damage taken | Damage share from route weapons |
| --- | ---: | ---: | ---: |
| Storm + chain | 120 / 120 | 3 | 88% |
| Blade + nova | 95 / 120 | 26 | 21% |
| Orb + pierce | 86 / 140 | 54 | 38% |

This is one seeded automated run per route, not a controlled before/after balance study. Blade + nova contributed 63% of damage in the anchor phase but only 10% in the final phase; the whole-run leader was orb at 42%. Reward preference therefore does not by itself establish a distinct late-game combat identity. Follow-up work should separate close-range opportunities, capped-family fallback rewards, and ranged damage coverage before tuning numbers. These observations do not establish a regression or a preferred difficulty level.

## Next player observation

With five first-time players, check whether at least four can explain that the side trip is optional and what it grants. Record who takes it, whether they return to the seal route, and whether they can name their main weapon after an automatic reward. Treat those as prototype hypotheses, not established outcomes. Physical phone touch and the relative difficulty of different builds still need separate playtesting.
