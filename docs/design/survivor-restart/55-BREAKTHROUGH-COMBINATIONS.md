# Acquiring a weapon changes the deliberate action

The fun goal remains open. The preceding ordinary Ember run reached level19
and a4:28 victory, but91% of cumulative damage came from the primary flame
family. The secondaries arrived later and required close contact, so this
ratio is not proof of a balance bug. It does expose a design question: does
acquiring a weapon change anything the player deliberately does?

Fantasy: choose a gap, break through the crowd, and let the acquired weapons
finish the landing together. The same Space/touch button remains the action.

|Loop|Action and feedback|
|---|---|
|5–10 seconds|Aim movement, commit to a landing, see the secondary attacks hit or miss, gather earned loot.|
|One run|Pick another weapon or strengthen the current one; the next breakthrough exposes that choice.|
|Next run|Try a different primary and secondary combination through the existing companions and codex.|

## Real combat contract

The primary keeps its ordinary path hit, damage and signature. Only acquired
non-primary weapons join the landing. Unowned weapons do nothing.

- Sword queues a forward swing. A current swing finishes first; the request
  lasts0.65 combat seconds. The same windup, arc, rank3/5 followups and real
  damage path run. It neither resets the auto clock nor becomes empowered.
- Ember fires its current rank's volley along the chosen landing direction.
  These shots have no homing target and can miss. Ordinary projectile
  collision, burn/blast identities, rank hops and the shared80-shot cap apply.
  It does not reset the automatic cast clock or consume a signature.
- Orbit makes one additional turn over0.6 combat seconds with the same heads,
  count, range and stretched shape. World-space swept arc samples prevent a
  fast head skipping enemies at30Hz. Samples share the existing0.4-second
  per-enemy gate. The short tapered wake follows each actual head.

These are added secondary attacks and therefore a power increase. No new
screen, resource or meter is introduced. Acquisition cards and the existing
equipment description name the actual landing behavior. Menus/hitstop freeze
the states; a new game clears them. Death, victory and the300-second deadline
retain priority over a new landing request. Recalled XP is scanned before the
new attacks, so their later drops are not part of the original landing pulse.

## Hypothesis and limits

The useful signal is whether a player recognizes that the acquired weapon
changed the next Space/touch action and begins choosing landing direction or
distance around it. More damage, more wins or more particles alone is not
the success criterion. Missed aim, delayed sword followups and unchanged
primary behavior should remain legible during ordinary play.

Nine focused rules and the full264 Node cases pass. Focused browser checks
cover desktop,320px portrait,740px reduced-motion landscape,390px touch,
acquisition copy and a12-second maximum rendered load with repeated bursts.
Independent review found no remaining P1/P2 issue. These do not prove fun.

An18-run comparison used the same existing pilots and ready-burst movement
policy in both306c473 and the frozen combat implementation: three seeds each
for Ash/blade, Ember/comet and Grove/lunar. Ash and Ember retained3/3 victories;
Grove changed0/3 to1/3, with the win at299.15 seconds. All samples stayed within
entity caps. Grove's remaining time-limit results are an unresolved limitation,
not evidence of overall balance. Ordinary play and release evidence are kept
separately in `output/playwright/survivor/landing-combo-*`.

An ordinary Ash run on10f09fd used free departure, Bookmark and Calm, acquiring
Ember at about8 seconds and Orbit at18 seconds before choosing Sweep,
Bulwark and Detonation. It finished with a4:15 victory, level19,1081 kills and
31/120 HP; two discoveries and one mastery badge appeared in the result.
Cumulative damage was74% Sword,25% Ember and1% Orbit. The defensive close-range
Bulwark choice and different acquisition times prevent interpreting this as a
controlled damage-share comparison. Browser errors and outer overflow were
absent. Recognizing the new deliberate action and wanting another run still
require player feedback.

The first successful release ran255 existing Node cases and301 browser cases;
the new nine rules were initially missing from the explicit npm CI list despite
passing locally. The follow-up adds that file to the same QA command. Its exact
Node command passes264 cases; subsequent CI evidence records the corrected gate.
