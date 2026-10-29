# Hold and release the companion's signature

The ordinary Ember walkthrough of a132bb6 won at4:29, but broad collection
loops still worked after several evolutions. Passive fire often killed
ordinary enemies before the new interruption offered a useful decision.
Victory did not contradict the human feedback that combat/growth felt dull.

## Player hypothesis

Prepare power through the companion's normal play, hold it, aim or wait, then
release when it matters. Basic attacks remain automatic. This replaces the
automatic signature trigger; it is not another passive damage proc.

| Layer | Concrete loop |
| --- | --- |
| Moment | Move/land ordinary attacks, hold one full charge, choose a release moment. |
| Feedback | The existing meter stays full; a distinct ready button and first-use prompt advertise the action. Actual attacks, sound and shield mark release. |
| Reward | Cut a line, place a splitting flame into a crowd, or guard a dangerous approach while steering returning runes. |
| Choice | Release now or conserve; the two aimed attacks can miss. Breakthrough retains its separate movement/loot cooldown. |
| Session | Build milestones/evolutions change the held attack alongside the existing automatic weapon; face the sovereign under the same five-minute deadline. |
| Return | Existing earned styles, mastery and collection remain. This slice does not claim to fix return motivation. |

## Input and combat contract

- E or the signature touch button releases the charge. Movement supplies the
  direction; stationary input uses the last movement direction. No mouse aim,
  targeting overlay or extra movement key is required. Space/breakthrough
  remains independently available with its existing costs/rules.
- Normal attacks never spend the stored charge. Full charge does not stack.
  First full charge keeps the instruction visible until the first use, except
  when the existing urgent recovery hint takes priority.
- Ash earns through six real sword contacts (at most three per combo). Manual
  release starts an aimed empowered swing, replacing an unfinished automatic
  swing. It spends at release, even on a miss, and emits three piercing blades
  without requiring a melee hit. Dawn retains its five returning blades.
  Existing damage multipliers/ranges remain.
- Ember earns through480 units of ordinary travel; breakthrough travel still
  cannot charge it. Release aims the volley without initial homing. Only its
  first shot is empowered; owned secondary-shot hops, burn/blast and splitting
  identities remain. The release starts the normal cast interval, preventing
  an immediate duplicate automatic volley. No charge is required for ordinary
  automatic fire.
- Grove earns six spaced real orbit contacts. Release grants the existing
 20-point/four-second guard and eight real piercing runes. Runes turn toward
  the current player after0.4s (or after three outward contacts), can hit again
  on return, and expire after1.2s. Each leg is capped at three distinct victims.
  Changing position changes their return path; another hit is not guaranteed.
  The existing five-second recharge rest starts on release.
- A request during hit stop is held until simulation resumes. Menu input is
  rejected; pause freezes an accepted request and attacks. New runs clear it.
  No release starts at the300-second deadline or after death/victory.
- Full shot capacity preserves Ash/Ember charge and acknowledges the blocked
  release. Grove can still activate its guard; its volley uses remaining slots.
  No pool cap, free XP, healing or enemy HP was increased.

## Verification and known limits

All284 Node rules pass, including holding ready charge across ordinary attacks
and breakthrough, actual aimed hits/misses, menu/hit-stop/deadline behavior,
capacity, shield absorption and real returning-rune collision/steering/caps.
28 focused browser cases pass, covering E, the real touch target, three
viewports, frozen pause state, outer overflow and breakthrough/landing
regressions. The disposable in-app Grove scene also confirmed the actual
button, shield and eight projectiles. These authored scenes are not normal
play. The final Pages build and saved-progress smoke pass for both entry routes.

An18-run comparison used the same current diagnostic policy for a132bb6 and
this version, seeds7/42/101: normal objectives/upgrades, breakthrough whenever
ready, and a visible-target turn/release when charged and in range. Baseline
ignores the new input and keeps automatic signatures. Wins were Ash3/3→3/3,
Ember1/3→3/3, Grove1/3→1/3. All runs ended within300s and entity caps.
These small samples establish possible routes, not win rates or player fun.
The policy was corrected to keep Ash's release inside its actual sword reach;
the first overly distant diagnostic was not a valid timing test.

Before returning runes, Grove had0/3 wins. Six extra seeds for that intermediate
version and baseline both had0/6 wins; this reinforced an existing late-boss
damage concern. Do not present those intermediate samples as verification of
the final returning-rune version. Final Grove remains a limited1/3 sample.

Normal play and human feedback must determine whether holding a charge adds a
decision players want to make, whether E/touch is discoverable without reading
the guide, and whether a missed shot feels fair. Ability use counts and a
successful boss clear alone cannot close the fun objective. Evidence is under
`output/playwright/survivor/manual-signature-*`.

## Ordinary play and integration follow-up

Two plain in-app Grove runs kept combat frozen at b4c96c4, using the earned
profile, Book/Calm and actual offers. Horizon lost at1:25/LV9 after prolonged
altar defense:6 releases/29 absorbed. The actual result recommendation then
prepared Bulwark at weapon rank1. That retry, with early Sword/Duelist, no
Ember, Fang/Dew and both weapon evolutions, won at4:10/LV20:10 releases/75
absorbed. A full charge was deliberately held into boss arrival and released
on approach. No preview, pilot, chosen seed, stat injection or reload was used.
Observation pauses/long key holds limit this as a reaction-speed playtest.
Different seeds/builds/decisions prevent a causal balance comparison. Strong
secondary Sword still slowed rune-contact charging in some stretches.

The first complete CI exposed an integration error missed by focused cases:
the signature icon cache reused equipment's `data-weapon`, making weapon-slot
selectors ambiguous. Use `data-signature-weapon` for that cache and assert
one equipped slot per family. Update the old automatic-guide expectation to
require charging and E/button release. The repair changes no combat rules;
the ordinary-run evidence remains applicable. Full CI/deployment must be
verified for the repair commit before calling the public release complete.
