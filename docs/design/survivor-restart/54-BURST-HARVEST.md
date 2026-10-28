# Fight into the loot

The overall fun goal remains open. An ordinary Ember victory on the previous
runtime reached level17 at3:31 and remained there through the4:20 result.
Remote kills kept producing loot while the player moved away from the old
kill sites. The saved run had pickup92. A separate observational ledger found
no raw-XP loss in six existing pilot routes, but ranged routes left135–263 raw
XP at boss arrival while close runes left0–10. Those pilots had pickup176 and
did not reconstruct the human-style route or prove why it felt dull.

## Decision inside the existing action

Breakthrough ends with a single recall of already earned gems within220 units
of the actual landing point. This includes normal loot from confirmed burst
kills on the last step. The scan happens before that step's automatic weapon
attacks, so their later drops do not join the pulse. There is no lasting aura,
extra XP, global vacuum, enemy deletion or new menu.

The player can move toward a loot cluster, break through the nearby enemies,
and gather the reward, or save the action for an incoming attack. The existing
120-unit travel,0.2-second duration,4.2-second cooldown,0.11-second dodge window
and primary damage multiplier remain. Loot still needs to reach the player.
Recalls use at least500 speed; an ordinary attraction already faster than500
is preserved. Elite/swarm recalls share this minimum-speed rule but keep their
existing ranges and rewards. Pickup upgrades keep working continuously.

The current button tooltip names the attack and collection. A short opening
coach explains the harvest from combat seconds5–12. Existing gem movement and
XP feedback show the result; no extra field-range rings were added.

## Calibration, including the rejected radius

The first160-unit experiment passed rule/interaction checks but did not
meaningfully shorten the measured ranged-growth gaps. In the low-pickup
comparison, one existing seed changed from a boss victory to a time-limit
survival. It was kept local and its separate report preserved.

The220 candidate was compared against8ea8d7f without recall using the same
input policy in both versions: use a ready burst along the existing pilot's
movement only when the220-unit landing area contains at least8 raw XP outside
the current pickup radius. Existing pilot decisions avoid further pickup
upgrades while alternatives exist; all twelve samples actually finished at
pickup92. HP, damage, spawns, clock, offers and chest behavior were unmodified.
Seeds12/42/99 and held-out7/28/77 produced six runs per version.

|Measure|Previous runtime|Landing recall220|
|---|---:|---:|
|Boss victories|5/6|6/6|
|Mean final level|20.33|20.83|
|Mean run end|283.62s|278.55s|
|Mean longest mid-growth gap|23.20s|21.20s|
|Mean outside-pickup XP at boss arrival|386.67|380.67|
|Mean outside-pickup XP at result|150.50|170.67|

These are small automated samples, not player enjoyment or universal balance
evidence. Result XP did not improve in every sample; not all remote loot is
collected by this bounded action. Seed28 still needed296.78s to win. Preserve
these limits rather than treating six wins as the completion of the fun goal.

## Verification

Seven added rule cases cover one-shot landing geometry and220/220.1 boundaries,
the uncollected starting area, ordinary last-step kill XP, stronger pickup,
raw-XP Dew healing exactly once, low-HP boss choices with banked XP and the
existing three-second combat interval, the300-second deadline and last-step
boss victory. Five new behavior cases were first observed failing before the
implementation. All16 burst rules and the full255 Node cases pass.

Four focused browser cases cover desktop,320px portrait, reduced-motion
landscape and touch. An authored scene needs the landing harvest to cross its
next real XP threshold; it verifies an actual growth choice, one burst, normal
kill count, unchanged HP/profile, Space protection and no outer overflow.
These scenes are disposable development setups, not ordinary-play evidence.
All four focused browser cases pass. The production build and production
smoke check also pass for both entry points with no asset or page errors.
Independent review found no remaining P1/P2 issue. Ordinary play and public
release outcomes remain separate from the comparative simulation.
