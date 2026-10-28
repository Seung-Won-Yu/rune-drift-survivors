# A lobby that keeps its place while choosing

The player accepted the night-outpost direction. This pass makes that composition
behave more like a game menu during actual preparation.

## Behavior

- Preparation tabs and preparation/records navigation now update their existing
  controls and panels. The companion stage stays in place; each editor restores
  its reading position and keyboard focus moves directly to the chosen tab.
- Equipment updates retain the decoded companion artwork. Selecting a different
  companion keeps the previous picture until the new portrait is decoded, then
  briefly transitions between them. A late response cannot replace a newer
  choice. A failed large portrait falls back to the selected companion's existing
  atlas instead of blocking departure.
- A selected card receives a small, brief press response. The current choice and
  real starting stats update immediately. Departure applies that choice at once,
  including while the decorative portrait is still loading.
- Selection focus is restored synchronously. An old entry-focus callback cannot
  focus a hidden lobby button after combat has begun. Reduced motion skips the
  transitions and cancels UI animations already running when the setting changes.
- Longer collection-goal hints wrap within the departure area rather than
  overflowing its right edge. The goal still opens its actual codex entry.

The save schema, unlock rules, starting ranks, combat stats and rewards do not
change. The existing game object is recreated for a changed preparation using
the same rules as before; navigation alone keeps the current preparation.

## Verification

The focused 23 existing preparation/selection scenarios and five new continuity
cases passed. The new cases cover desktop/portrait scroll and focus, delayed
images arriving out of order, reduced motion during image loading, a failed
portrait and immediate departure while the image remains pending.

In the in-app browser, a disposable earned-profile preview was used to select
Ember then Grove, equip the bookmark, depart, earn level 2 and strengthen the rune.
The selected Grove began at 125 HP with its actual starting rune; the bookmark's
20% first-minute XP bonus appeared in collected XP. Movement resumed immediately
after growth. Console warning/error logs were empty. This was an opening-flow
check with an earned-profile fixture, not an ordinary boss victory.

Core checks passed **211/211**. The full browser run reported **245 passed** after
its final case, but the local runner remained alive for at least 90 seconds and
was interrupted; its exit status was 130, so it is not a clean full-run exit.
The focused existing 23-case and new five-case runs both exited successfully.
The Pages build and production smoke passed with no failures or browser errors.
The independent release workflow must finish normally before publication is
reported as verified.

These checks establish continuity and reliable input; the whole-game enjoyment
goal still requires player feedback on the complete journey.
