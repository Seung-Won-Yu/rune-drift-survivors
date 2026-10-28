# Sword ranks that change the fight

The player accepts the outpost direction but still finds combat and growth
uninteresting. The hypothesis here is that an early weapon rank should change
what the player sees and hits, before a fully evolved build is available.
This is a playable experiment, not a finding that the game is now fun.

## Rules

| Sword rank | Direct attacks within one combo |
| --- | --- |
| 1–2 | Existing full opening cleave |
| 3–4 | Opening cleave, then one fresh-target cut |
| 5–6 | Opening cleave, then two fresh-target cuts |

The opening still contacts at 0.18 seconds and keeps its entire existing damage
and branch coverage. Rank 3 follows at 0.34 seconds; rank 5 follows at 0.31 and
0.44 seconds. The combo ends at 0.55 seconds without extending the existing
attack cooldown. Growth cards and earned receipts name the new behavior only
at ranks 3 and 5.

Each follow-up seeks one living, not-yet-hit enemy within normal sword reach
and the opening direction's forward half-plane. The nearest qualifying target
is locked 0.08 seconds before contact. Contact rechecks reach and a narrow
angle, so enemies can leave the path. Targetless beats produce no pretend
strike, sound or attack pose. Each cut uses the normal sword damage and the
canonical damage, knockback, kill and XP path. Enemy IDs prevent repeated direct
damage within the combo.

Sweep retains its broad first cleave; Duelist can dispatch separate successive
targets. Dawn and other companions' secondary swords use the same milestones.
The empowered opening, charge consumption and crescent/fan emission happen
only once. Follow-ups do not repeat those effects. Normal combos charge Ash on
at most three unique direct contacts in total; empowered combos do not recharge.
A missed empowered opening retains its charge, as before.

The attack frames, body pose and fallback rendering share the real contact
schedule. Regrip blends out of the previous release, and follow-up cut curves
alternate direction. All use simulation time, freeze in menus and yield to hurt
and defeat poses. Reduced motion keeps compact contact feedback without body
motion. No new hit-stop or attack warning overlays were added.

## Ordinary first-minute check

An isolated local origin preserved the player's existing save. A fresh Ash run
used ordinary movement, growth selections, the altar and the breakthrough
button: no pilot, QA scene, forced clock, inherited style or keepsake. UI pauses
between observations make it a bounded manual check, not uninterrupted play.

- Sword 3 was earned at about 0:24 and sword 5 at about 0:42, with Duelist.
- The altar supplied Fang. Root Warden was defeated by about 1:13; the actual
  evolution material check became complete.
- Orbit was earned next, followed by Dawn at about 1:16. At the last recorded
  1:24 observation the run was level 10, 199 kills and 41/140 HP after collecting
  a healing fruit. The run was then paused and the temporary tab closed.
- No browser warnings/errors were recorded. The first elite and actual growth
  milestones were checked; this run did not reach the sovereign or a result.

The low health and repeated spore/contact damage remain relevant friction.
This check establishes real attack/growth operation, not improved survivability
or enjoyment. Controlled contact scenes separately use stationary high-health
targets and must not be presented as ordinary play.

## Diagnostics and limits

The unchanged blade pilot ran Ash with explicit Sweep and Duelist preparations,
seeds 12/42/99: six baseline runs on `9bae24e` and six current runs. All twelve
won and stayed within entity caps. Sweep completion became slower in all three
seeds (256/259/274 seconds to 294/277/286); Duelist was mixed
(253/270/283 to 264/253/268). Build choices and combat feedback shift over a run,
so these small automated samples establish neither a universal buff nor balance.

A second measurement of those six current runs counted eligible rank-3+ attack
cycles and actual extra contacts. Sweep had 387 additional hits over 1,045
eligible cycles (37.0%); Duelist had 787 over 886 (88.8%). A combo may have two
follow-ups, so these are extra hits per cycle, not a percentage of combos that
triggered. They show that the feature occurs in normal-rule simulations.

Focused checks cover all ranks, full opening damage, same-enemy exclusion,
target entry/escape, charge caps, empowered misses, one fan, menu lifecycle,
pose continuity and actual mirrored cut paths. Browser checks cover real
milestone choices and receipts at desktop, narrow portrait and landscape sizes,
plus the three actual engine contact beats. Final suite/release results are
recorded separately after execution.

The next human check is whether the first rank-3/5 changes are noticeable and
worth pursuing. Other weapons' damage-only ranks, repeated growth interruptions
and the overall encounter structure remain open if the fight still feels flat.
