# Field readability

Make the existing fight easier to read while preserving its difficulty, silhouettes and compact HUD.

- Spore patches keep their original footprint. Five small plumes appear at the real activation threshold, with a warmer edge and denser ground fill. Ordinary and royal spores use their respective rules. Plumes stay inside the patch; reduced motion keeps them still.
- During the final 35% of a giant's windup, the existing boundary gradually warms and thickens from 1.5px to 3px. No expanding ring, flashing, target tether or new warning text. The boundary disappears when the actual impact happens.
- Low-health fruit guidance includes the nearest fruit's direction and distance, rounded up to ten world units. During its final ten seconds, both the HUD and the fruit label show remaining time. They use the same simulation clock, so pauses do not consume the remaining time.

Damage, collision, enemy timing, recovery amount, recovery spawns, upgrade drafting and saves are unchanged. The player's 12px contact radius still participates in area collisions; it is not an extra invisible attack range and does not justify another larger warning diagram.

## Verification

- 44 focused unit tests passed, including real activation thresholds, footprint bounds, one-way windup emphasis, deterministic/reduced-motion drawing, nearest-fruit direction and pause-safe expiry.
- 13 focused browser cases passed: fruit collection, expiry text, pause/resume, HUD overlap, no page scrolling, and dense combat. New guidance checks cover 1280×720, 320×568 and 740×360.
- Dense rendered scenes at 1280×720, 390×844 and 740×360 recorded p95 frame intervals of 16.7ms, with no frames over 50ms. These are desktop-browser viewport checks, not physical-phone benchmarks.
- In-app browser inspection covered desktop and narrow portrait layouts, live movement and fruit collection. A controlled scene confirmed the +25 recovery and subsequent removal of its location/countdown prompt. This is targeted interaction evidence, not a full ordinary-run completion.
- Independent review found no actionable regressions in collision, reduced motion, pause timing or preview storage isolation.

The local `?preview=field-practice` scene starts paused with low health, an expiring fruit, spores and a giant. Resume through the normal button and move to test the interaction. This development-only preview uses a disposable profile and is excluded from production. Captures stay in ignored `output/playwright/survivor/`.
