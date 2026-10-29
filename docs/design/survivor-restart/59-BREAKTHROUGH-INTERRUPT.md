# Interrupt an ordinary windup

The fun objective remains open. Previously, a surviving ordinary enemy kept
preparing its attack after a breakthrough hit. The action supplied movement,
damage and loot collection, but no way to cancel that preparation. This slice
adds one deliberate choice inside the existing movement/Space/touch loop:
evade the warning or spend the same cooldown to hit the preparing enemy.

## Combat contract

- Only a real primary breakthrough path hit can interrupt. Ordinary Hound
  preparation must still be younger than its0.8-second windup; an ordinary
  Giant's unspent slam must be younger than1.15 seconds.
- The target must survive that hit. It then clears that preparation, receives
  its ordinary attack cooldown and stops moving/starting attacks for0.35 combat
  seconds. Its hit pose, a small `끊음` label and the existing notice confirm it.
- A released attack cannot be undone. Enemy attacks update before breakthrough
  contacts, so a contact crossing the release boundary is already too late.
  Off-path enemies, champions, elites, the sovereign and released spores are
  unaffected. Ordinary weapon hits cannot interrupt.
- Breakthrough damage, travel,4.2-second cooldown and0.11-second dodge protection
  stay unchanged. Interruption adds no XP, charge, healing or damage multiplier.
  A killed target grants its ordinary loot without a false interruption.
- Pause/choices freeze recovery; death/victory still take precedence. No new
  interruption starts at the300-second deadline. Fresh games reset the count.
- The first ordinary Hound/Giant lesson and the action's help text explain
  targeting the body. There is no new meter, warning ring or input button.

## Verification and limits

All277 Node rules pass. Focused rules exercise real contacts, exact ordinary
damage, one interruption per target, late/off-path attacks, protected enemies,
passive hits, killed targets, frozen recovery and later attack availability.
Three browser cases pass at1280/390/740px, covering the real button, disappearance
of the warning, acknowledgment, no free XP/kill, pause and outer overflow.
The in-app walkthrough also performed the action in disposable `interrupt-giant`.
That authored scene has a sturdy single enemy and is not an ordinary run.

An18-run comparison used30dd7f1 and the new combat rule, the same existing
pilots, ready-breakthrough policy and seeds7/42/101. Ash/Ember/Grove victory
counts stayed2/3,3/3,0/3; all runs ended within300 seconds and entity caps.
The current samples interrupted1,3,5 attacks respectively across each three
runs. Pilots were not changed to target this mechanic, so those numbers do not
measure its usability or desirability. Grove's deadline survivals remain a
limitation. The final small label uses the existing capped effect pool.

The next ordinary playtest should observe whether the player changes direction
toward a preparing ordinary enemy, recognizes a successful stop and still
chooses evasion when other threats make contact unsafe. Passing rules and
unchanged victories do not prove that this is enjoyable. Logs and comparison
records are under `output/playwright/survivor/interrupt-*`.
