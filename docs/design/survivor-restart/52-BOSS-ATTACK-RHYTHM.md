# A second decision after the charge

The overall fun goal remains open. An ordinary fresh Ash hybrid won at 4:18 on
`760de68`, with a completed Comet/Lunar build; only 14 damage was received during
the final boss. That is one manually paused run, not proof that every build
finds the boss easy. The normal-rule pilot baseline has much longer fights and
time-limit survivals, so increasing boss HP across all builds is not the change.

## Actual combat rules

The charge keeps its one-second warning, 0.65-second travel and 0.8-second
recovery. After that recovery, the sovereign immediately starts a newly aimed
thorn warning. It locks the player's later position and grants the full
one-second response time. Only after the thorn release/recovery does the
existing 2.6-second rest resume (×0.7 while enraged).

The intended choice is to move off the first lane, take the short opening and
respond to the new aim, then return to range during the end-of-pair rest.
Breakthrough remains 4.2 seconds with 0.11 seconds of dodge protection, so it
cannot cover both responses by repeated activation. Boss HP 3200, charge/thorn
damage 28/16, thorn counts 7/11, projectile lifetime and caps are unchanged.

At aiming time a charge captures `min(270, distance + 72)` as its length. The
later player position cannot stretch or rotate that lane. This avoids sending
the boss far past a nearby melee player, where an immediate thorn phase would
otherwise remove the old opportunity to approach. Older development patterns
without a stored length retain the 270-unit fallback.

Actual movement and both warning layers use the same length. The floor and
upper outline form a capsule with 32-unit end caps: the real swept boss body.
A player's 12-unit collision radius can overlap that visible area from outside;
an apparently clear rectangular endpoint must not conceal the rounded hit.
The recovery caption warns of the coming thorns, while already travelling
thorns keep priority over a safe-opening caption. No new range rings were added.

## Evidence that shaped the change

The unchanged six pilot routes across seeds 12/42/99 produced 18 runs per
version. They use ordinary rules and actual offered growth/chest decisions,
with the existing warning reaction and no newly added evasion or breakthrough
input. This is comparative simulation evidence, not a human enjoyment score.

| Variant | Victory | Five-minute survival | Total warnings / charges / thorns |
| --- | ---: | ---: | --- |
| Baseline `760de68` |15|3|133 /68 /61|
| Immediate follow-up, full-length charge |13|5|172 /88 /84|
| Paired attacks, distance-locked charge |16|2|161 /81 /74|

The middle experiment changed Bulwark seeds 42/99 from wins to timeouts. Its
Grove/Bulwark samples spent 48.5% of the final fight farther than 160 units,
against 35.0% in the baseline. Distance locking reduced that fraction to 23.2%
and all three Bulwark samples won. It did not improve every path: Horizon
seed 99 became a timeout, and Ash/Sweep seed 99 still timed out. No entity cap
violation occurred. The baseline's original prose count was corrected from
16/2 to 15/3 after checking the actual JSON records.

The first two new rule tests failed on the baseline, then passed with the
paired behavior. 244 Node checks cover fresh aim, full warning, actual thorn
damage after stopping, a second lateral escape, enrage counts, pause, the
final rest, locked endpoints and physical hit/miss end-cap boundaries.
Independent review found the initially rectangular endpoint mismatch; rounded
ground/outline caps and boundary regressions resolved it. Actual rendering
checks share the physical length and confirm read-only rendering.

Twenty focused boss/HUD browser cases passed after the pairing change, followed
by six after distance locking and three after the final rounded caps. The final
three include desktop, 320px portrait and reduced-motion landscape. Build and
production/public outcomes and ordinary Grove play are recorded separately
after completion. These checks verify the implemented loop, not whether the
player now finds the whole game satisfying.
