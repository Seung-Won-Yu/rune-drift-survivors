# Moving faster must not strand a caught reward

The fun objective remains open. The preceding ordinary Grove run had a32-second
growth gap, but its speed168 does not reproduce the fast-pickup failure below.
This fix must not be described as the proven cause or solution of that gap.

## Reproduction and contract

In an isolated real update loop, a5-XP gem starts63 units behind Ember and
receives one ordinary attraction frame. Three seconds of movement collects it
at base speed184. At Fleet4 speed242.88, the old pull falls behind the player,
the gem leaves the64-unit pickup radius and stops. XP remains0 with the gem
about777 units behind. No enemies, bonus XP or breakthrough are involved.

Ordinary pickup now latches an `attracted` flag on a gem once it actually enters
the current pickup radius. It keeps following, with the existing pull curve
and a minimum speed of player speed+60. Recalled loot retains its500 minimum
and any stronger ordinary pull. The trigger radius, XP curve, drop amounts,
breakthrough pulse, healing rule and field rewards are unchanged. Untouched
out-of-range gems stay on the ground. Menus freeze the same update loop and
new games start with a fresh empty gem array. This is a collection benefit,
not an additional source of XP, damage or invulnerability.

## Evidence and limits

All272 Node rules pass. Added regression cases cover all three companions at
base/Fleet4 speed, untouched outside-range loot, menu freezing, exact raw XP
and Dew healing once. Existing breakthrough/conservation/strong-pickup cases
still pass. One new browser test and a manual in-app browser check collect
exactly5XP while moving away; the disposable `pickup-chase` DEV scene uses an
isolated profile and no weapon. It is not an ordinary full run.

An18-run comparison used baseline5419841 and this frozen implementation,
the same pilots, ready-breakthrough policy and seeds7/42/101. All runs ended
within300 combat seconds and respected enemy/projectile/effect caps.

|Companion|Baseline → current mean longest growth gap|Victories|
|---|---|---|
|Ash|30.3 →23.6s|2/3 →2/3|
|Ember|25.4 →26.2s|3/3 →3/3|
|Grove|29.1 →21.9s|0/3 →0/3; deadline survival|

These are input-driven simulation samples, not a general balance estimate.
Changing pickup changes later choices, paths and deaths; the result does not
isolate the cause of each growth gap. Ember's gap did not improve, and Grove's
boss damage/timing limitation remains. Raw results and test logs are under
`output/playwright/survivor/pickup-*`. The next fun test still needs a human
to judge combat decisions and desire for another run, not merely faster XP.
