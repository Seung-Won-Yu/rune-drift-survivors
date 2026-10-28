# Put a decision back into the fight

## Evidence and intent

The player accepts the outpost presentation but still finds combat and growth
uninteresting. Another visual pass does not test that complaint.

A manual fresh-profile Ash run on commit `8c39a88` ended in defeat at 4:12,
1,097 kills and level 18. It earned all three evolutions through ordinary play.
This is not a boss victory or a balance benchmark. Two concrete friction points
were visible: banked XP opened another growth screen immediately after an
evolution, and the same owned secondary weapon appeared in several consecutive
drafts. The run's warning/error console log was empty.

The player fantasy is to cut a deliberate escape through a closing crowd, then
feel the chosen build change the fight before making the next growth decision.

## Small playable change

| Layer | Prototype behavior |
| --- | --- |
| Moment | Move and auto-attack; choose when and where to make a short directional breakthrough. |
| Feedback | Actual movement along a bounded path, a real primary-weapon hit and a brief path streak. |
| Reward | Create room, kill nearby threats and collect their ordinary XP. |
| Choice | Spend the breakthrough to attack a crowd or keep it available for an incoming threat. Choose primary growth, a rotating support family or utility between encounters. |
| Session | Existing five-minute chapter, champions, boss and honest defeat/survival/victory outcomes. |
| Return | Existing companion, style, evolution and relic discoveries; no new currency or chores. |

1. Choosing growth banks remaining XP and returns to actual combat for three
   simulation seconds, or four after an evolution. Only afterward may one next
   earned level open. Pause and other choice screens do not consume that time;
   the normal chapter ending still takes precedence. Existing post-choice
   invulnerability is not extended.
2. Both discovered and undiscovered support families rotate when actually
   offered. Capped weapons are skipped. Choosing an evolution or a full branch
   offer does not consume a support offer the player never saw.
3. The breakthrough prototype uses Space or an explicit touch button. It travels
   a bounded distance over a short simulation duration, has a cooldown longer
   than the boss's attack interval and only a brief part of that travel is
   invulnerable. A primary-weapon hit follows the actual path once. Automatic
   weapons and companion signatures keep their own clocks; burst travel does
   not generate Ember's movement charge.

The initial values are 120 units over 0.2 seconds, a 4.2-second cooldown, 0.11
seconds of distinct dodge protection and primary damage ×1.2. Each enemy is hit
once per use. Space does not purchase growth/relic cards if a combat tap crosses
the menu transition; the advertised number keys, Enter and pointer input do.
Other native HUD/menu buttons retain their Space behavior.

Movement, hit detection, damage, XP, cooldown, pause and restart must all be real.
No cinematic fake kill counts or decorative attacks stand in for those rules.
The first slice shares the directional action across the three companions and
uses their existing primary damage/material interactions, rather than adding
another set of upgrades before the action itself has been playtested.

## Reference principles

[HoloCure's developer page](https://kay-yu.itch.io/holocure) identifies unique
character skills/special attacks and build experimentation as features.
[Death Must Die's developer-authored store page](https://store.steampowered.com/app/2334730/Death_Must_Die/)
emphasizes varied synergies and heroes with traits that alter play. These support
testing distinct decisions and build behavior; neither source proves that this
prototype's numbers or added input will be fun. The particular breakthrough
rules above are this project's experiment.

## What would disprove the hypothesis

- Growth windows still feel like interruptions rather than a payoff.
- The breakthrough becomes a button pressed on cooldown with no directional or
  defensive choice, or is so safe it removes the boss's threat.
- Touch players trigger it accidentally while steering.
- The support rotation is varied on paper but choices still feel equivalent.

Check first-minute combat, a focused and a hybrid build, the final boss and a
real player's desire to continue. Passing automated rule tests is necessary
evidence for reliable implementation, not proof of that desire.

## Current evidence

- Node checks: **222 passed**, including nine breakthrough cases covering bounded
  travel, last direction, cooldown requests, pause, short dodge protection,
  primary damage, path-only kills/XP, Ember charge/burning, hit-stop input and
  actual boss damage/entrance protection.
- Full browser suite before the final Space-on-card safeguard: **250 passed
  (5.5 minutes), exit 0**. Cleanup took time but completed naturally. Seven
  focused input/growth/touch cases passed after that safeguard; its final narrower
  card-only version also verifies native Space reroll/pause behavior.
- The final Pages build and production smoke passed with no failures/errors.
  Final assets are `main-DMw_cnSQ.js` and `main-yRO2OGpW.css`. Public release
  checks are tracked separately from these local results.
- The self-hosted font covers every Hangul syllable in the updated UI sources.
- An independent source review found no concrete P1/P2 issue in the new rules
  and input path. Ordinary in-app play with an earned Ember/Detonation/Bookmark
  preparation confirmed growth, banked XP, breakthrough activation and immediate
  return to movement without console warnings/errors. The controlled lane
  scenario separately exercises the actual path hit; it is not a normal run.

An isolated comparison used `git archive 8c39a88` as baseline and byte-matched
working-tree source copies as current. Both executed the same existing 18-run
flow script (three characters, focus/hybrid, seeds 12/42/99). Its pilot sends no
breakthrough input, so this measures growth/offer changes only:

| Metric | Baseline | Current |
| --- | ---: | ---: |
| Victory / time-limit survival / defeat | 12 / 4 / 2 | 13 / 3 / 2 |
| Minimum consecutive-choice interval | 0.19 s | 3.00 s |
| Intervals below three seconds | 13 | 0 |
| Mean final level | 20.78 | 20.67 |

All 18 runs per version ended and stayed within entity caps. Character outcomes
were mixed: Ash 4V/2S/0D → 6V/0S/0D, Ember unchanged at 4V/0S/2D, Grove
4V/2S/0D → 3V/3S/0D. First growth remained about 5.25 seconds and first evolution
about 83 seconds. Grove timeouts and Ember defeats remain explicit concerns;
the comparison is not a claim of universal balance or improved enjoyment.

## Ordinary-play follow-up and growth disclosure

Release `d242661` passed the exact-head GitHub Actions run `40664343568`:
222 Node checks, 251 browser cases and the public production smoke. Both public
entry paths served the expected assets and the breakthrough control appeared
after actual departure.

A separate local origin kept the player's real save untouched. An initial Ash
run ended at 1:09 after tool/inspection delays; it is not a useful skill or
balance measure. The retry used ordinary inputs, no QA scene, pilot, forced
clock, inherited style or keepsake. Deliberate UI pauses between observations
prevented idle damage, so this was not an uninterrupted human-like session.
It defeated Root Warden and Thorn Hound, evolved Dawn at 1:16, and ended in
defeat at 3:11, level 16, 707 kills. The final sovereign was not reached.
The run produced no console warnings/errors.

The directional breakthrough created actual paths through crowds and helped
recover dropped XP. Healing fruit and champion recovery kept the run alive,
but several levels went into health rather than attack growth. That observation
does not by itself establish a balance defect or improved fun.

One concrete information gap was visible: sword ranks sped up the actual
attack clock, but the card listed only damage and range. Its `선택하면` preview
now obtains the next interval from the same `stats()` calculation used in
combat, including the chosen branch, and shows the rounded seconds before and
after. Dawn's Ash-only charged five-way return is also disclosed; other
companions are not promised Ash's signature. The existing receipt uses this
same comparison. Damage-only fire ranks remain honestly described as damage
growth; no attack, cooldown, healing or draft rule changed in this follow-up.

The updated copy was rendered in the in-app browser at desktop, 320×568 and
740×360. Text stayed within its card, page overflow remained zero, and choosing
Dawn returned to play with the same effect in its receipt. Existing focused
browser regressions passed 15 cases; the 222 Node checks passed. Human feedback
on the breakthrough and growth rhythm is still needed before calling the
combat loop satisfying.
