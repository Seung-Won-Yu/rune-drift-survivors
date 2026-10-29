# Fire and runes that change how space is used

The player still finds combat and growth flat. Following the sword experiment,
this slice gives the other two weapons different physical behavior before
evolution. It does not change the accepted outpost presentation or add another
currency, progression layer or menu. Human enjoyment remains unproven.

## Fire: moving between targets

At rank 3, the existing secondary flames (every volley shot except the first)
can leap once to a fresh enemy within 180 units of impact. At rank 5 they can
leap twice. A continuation reuses the projectile, flies at 360 units/second,
receives 0.65 seconds of lifetime and halves its damage at each leap. It has to
physically arrive; the next enemy is not damaged by target selection.

The opening damage, volley count and cadence remain. The first flame alone
can consume Ember's movement charge and split into three fragments. Neither
that flame nor its fragments receive this continuation. Each bouncing shot
keeps its own visited IDs; it cannot return to a prior victim. With no fresh
target in range, it ends normally.

Detonation and Comet keep the secondary shot's original explosion. All IDs in
that first explosion are captured before damage/death changes the scene and
excluded from the same shot's continuation. Every later leap is a smaller
direct hit with no repeat explosion. Wildfire/Coal keep their existing contact
burn and bounded death-spread rules. No new projectiles are allocated by a leap.

This tests whether groups of enemies become a useful route for ranged attacks.
It does not make an isolated boss take repeated hits from the same projectile.

## Runes: reach with an exposed side

Rank 1–2 keeps the existing circle. During ordinary movement, rank 3 stretches
the travel axis to 1.30× and compresses the perpendicular axis to 0.75×. Rank 5
uses 1.55×/0.60×. Gentle touch input scales the deformation. Stopping returns to
a circle. The player can press toward distant enemies or stop/change direction
to bring the short side back through nearer enemies.

A symmetric matrix blends in simulation time over a 0.18-second time constant.
Opposite directions share an axis, and a turn cannot teleport the heads. A
breakthrough holds the existing shape rather than charging or rotating it.
Menus and hit-stop freeze it. Collision, rendered heads and short wakes read
the same transform without changing it.

The original branch radius, count, spin, 0.4-second enemy contact gate, rune
charge gate, shield and Lunar pulse remain. At rank 5 Bulwark's radius 46 spans
about 71 along travel and 28 across it; Horizon's radius 136 spans about 211/82.
The larger short-side gap is disclosed in cards and equipped descriptions.
It is a real weakness, not a cosmetic orbit deformation.

## Evidence and limits

239 Node checks passed, including eight new rule groups and a physical-wake
regression. Eighteen focused browser checks passed with normal exit: milestone
cards/receipts/equipped descriptions at desktop, narrow portrait and landscape,
real moving rune heads, and an actual flame continuation paused in flight.
Independent source review found no remaining P1/P2 issue and reran the 58
related rhythm/presentation checks successfully. The Korean subset includes the
new text; no external runtime font request was introduced.

An isolated comparison ran the same existing pilot for Ember's two branches and
Grove's two branches, seeds 12/42/99, twelve runs per version. Baseline `8d0c3f3`
won all twelve. Current won eleven; Bulwark seed 12 reached the time limit.
Levels remained 20–21 and entity caps held. Current Ember runs recorded
457–692 continuations each; the baseline had none. Both versions' Grove guard
activations stayed at 31–33. Shape eigenvalue extrema were not recorded because
the diagnostic originally queried the wrong collection; this is a measurement
limit, not evidence that the shape stayed circular. Copy hashes were checked
against the current engine and helpers.

These small samples do not establish overall balance or improved fun. The
Bulwark timeout and the effect of a narrower side on ordinary play remain
explicit checks. Full CI/public checks and ordinary-play observations are
recorded separately after execution.

## Make the existing attack milestone readable before choosing

The ordinary play review found attack changes trailing damage, radius and
cooldown numbers. Rank3/5 Sword, Ember and Orbit cards now label the offer
`공격 변화`, lead with the real continuation/stretch description and place the
unchanged numeric comparison beneath it. The descriptions share the same
bladeGrowth/emberGrowth/orbitGrowth functions as existing rank disclosure;
ordinary upgrades retain their normal labels. Choosing still grants exactly
one offered rank. No damage, draft weight, combat gate or reward is changed.

All269 Node cases and24 existing milestone browser cases pass. The latter
cover three weapon families, both milestones and1280/390/320/740px screens,
checking the leading effect, retained numeric detail, clipping/outer overflow,
keyboard selection, actual acquired rank and receipt. An in-app browser check
also confirmed the desktop presentation. These prove disclosure and selection,
not that the combat is now enjoyable; the open fun goal remains unchanged.
