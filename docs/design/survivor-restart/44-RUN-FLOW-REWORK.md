# Run flow rework — 2026-10-28

## Problem and hypothesis

The player reports that the whole run feels uninteresting. Recent work improved
presentation and guidance, but did not prove that the player wanted another run.
The current hypothesis is weak encounter rhythm and too little early build
commitment. Faster rewards alone are not the success condition.

Keep the illustrated 2D forest, movement controls, automatic attacks, existing
characters, discoveries, progression and both entry URLs. Do not add currencies,
daily chores or collection pages to compensate for a weak combat loop.

## Playable changes

- The first ordinary spawn brings six nearby mushrooms. Each drops 1 XP; the
  encounter creates immediate combat without granting an instant level. Normal
  reinforcements start closer for the first ten seconds.
- Normal growth offers primary growth, one rotating alternate and utility where
  those categories remain available. The two alternate families appear across
  successive early drafts. Choosing a new attack competes with concentration or
  survival rather than occupying both alternative slots every time.
- A rank-2 weapon can choose a specialization from level 3. Choosing a branch
  remains exclusive for that weapon. Evolution still requires rank 3, its support
  and an elite kill. UI goals, experiments, collection hints and preview scenes
  use the new specialization gate.
- At 22, 94, 154 and 212 seconds, a two-lobed front of 14/20/26/32 weak mushrooms
  can enter. Their shared approach leaves another side open. Players can turn
  into the crowd for kills and XP or move away. These use real damage, collision,
  spores, loot and entity budgets; they are not decorative enemies.
- Breaking the entire front within 26 simulation seconds recalls existing gems
  within 320 units and reduces reinforcements for five seconds. This grants no
  XP out of thin air, no automatic rank and no healing. Timeout gives no reward.
- A full field or an active champion can defer a front for up to twelve seconds.
  Champion admission preserves active front members. Boss arrival cancels front
  tracking and harvest relief.
- Between attacks, the boss approaches to 90 units instead of parking at 180.
  The defensive rune's collision reach is 92 units against this boss; the new
  distance allows real close-range attacks without forcing the player to chase
  a stationary ranged opponent. Its health, damage, windups and attack geometry
  retain their existing values.

## Evidence and limits

`node scripts/survivor-flow-balance.mjs <tag>` compares three characters, two
choice policies and three seeds with ordinary combat rules. Movement and offered
choices are automated. Outputs go to ignored `output/playwright/survivor/`.

The baseline and revised 18-run samples show these median simulation times:

| Character | First kill, before → after | First growth | First branch |
| --- | --- | --- | --- |
| Ash | 8.48 → 2.33 s | 11.28 → 5.42 s | 33.70 → 17.63 s |
| Ember | 1.93 → 1.15 s | 7.98 → 6.67 s | 35.27 → 17.33 s |
| Grove | 8.45 → 2.37 s | 11.60 → 4.13 s | 34.84 → 18.64 s |

The branch column combines focused and hybrid policies; it is not a promise for
every human run. These samples do not establish enjoyment or universal balance.
In the initial flow-only sample Ash won 5/6, Ember won 5/6 with one death, and Grove reached
the time limit in all six. Grove's final fight and builds that converge late in
the run remain explicit concerns. Do not turn those results into a claim that
all characters feel good or that the game is finished.

The follow-up boss-access sample uses the same 18 routes/seeds. Ash and Ember
won 6/6 each; Grove won 2/6 and reached the time limit in four. This supports
testing the approach change further, not a target of identical automated win
rates. The original defensive route spent only 15.05 of 60 boss seconds inside
its weapon reach; its longer-range alternative spent 28.37 of 35.03 seconds
inside reach. The pilot follows XP, so a human deliberately approaching the
boss may behave differently.

The in-app browser was used for manual opening movement, collecting XP, selecting
the rank-2 sword style and approaching its first crowd. This is separate from the
automated real-time full-chapter and responsive browser checks.

Verification before release:

- 200 Node tests passed, including real-attack front completion, recall bounds,
  pause/deadline behavior, capacity deferral, champion eviction and the earlier
  branch gates. Independent review found and verified fixes for a rank-2 Horizon
  preview that missed its targets and a champion evicting an active front member.
- New normal-rule opening/harvest browser checks passed at 1280×720, 390×844 and
  740×360. No outer scrolling was observed.
- Existing targeted browser checks exposed a 42px landscape choice scroller and
  unstable hover movement in a narrow portrait choice. Less landscape footer
  spacing and stationary hover feedback fixed the reproduced checks; comparison,
  goal, experiment and choice-accessibility retests passed.
- The initial automated real-time Ash route reached all three champions, completed both
  optional objectives, defeated the boss at 268.52 simulation seconds and saved
  the result/restarted correctly, without browser runtime errors.
- The boss approach change passed 18 targeted browser checks, including attack
  warnings, actual damage, pause and the three main viewport shapes. The queued
  upgrade keyboard check now verifies that the visible first card is applied
  and every other rank stays unchanged, independently of the changed offer order.
- Production build and smoke checks passed for both entry paths, existing saves,
  assets and the absence of development QA APIs in production.

## Next player test

Play one focused build and one hybrid build without inherited specializations.
Compare the decision before the first front, whether entering the crowd feels
worth the risk, and whether clearing it produces a satisfying recovery. Then
check minutes 2–4 and the final fight for long stretches of circling without a
new decision. More crowded scenes or more upgrade clicks alone do not pass this
test. The overall fun objective stays open until actual play feedback supports
the new flow, including its later stages.
