# A discovered alternative can change the next opening

The fun goal is still open. In the ordinary Ash result→codex→result→next-plan
walkthrough, the earned profile had21/22 entries and both Sword branches.
The suggested Duelist plan still cleared inheritance and started another
level1 discovery journey, waiting for Sword2/level3. The preparation screen
explained this accurately, but the player had already earned the alternative
and the existing inheritance system could use it from departure.

The result plan now distinguishes two existing paths:

- A discovered, valid starting-weapon branch offers `이 전투법 전승하기`.
  It selects that companion and the existing inheritance. The next run starts
  with primary rank1 and that single branch; other weapons, relics and
  evolutions are not carried over. The result explains the reset.
- An undiscovered alternative remains an optional ordinary experiment.
  It buys no ranks, changes no offers and still allows a different choice.

`nextExperimentPlan` derives one read-only plan for the card and click handler.
The click still validates the current recommendation and companion unlock.
Both paths clear the old collection goal; otherwise a conflicting branch goal
would suppress inheritance through `runPreparation`. The profile changes in
memory before persistence, so an unavailable save does not block this window's
prepared run and its warning remains visible. Preparing a run does not add a
second result record or reset the earned collection.

## Verification and limits

The full265 Node rules pass. Four browser cases cover1280px,320px,740px and
save failure: switch from the old inheritance to the recommended one, clear
experiment/goal, preserve counters, reload, then actually start at primary1
and branch1 with no carried gear. Nine existing experiment-related browser
cases pass, including unknown discovery, voluntary branch change, companion
switching, keepsakes, storage failure and codex handling.

The first new browser harness captured a profile before the result UI had
recorded the completed scene. It was corrected to wait for the actual result
action before taking that baseline; the counter assertions remain unchanged.
The same component layout and navigation are retained. This removes an earned
replay delay, but does not prove that the combat or overall run is enjoyable.
Ordinary play and release outcomes are recorded separately under
`output/playwright/survivor/known-branch-*`.
