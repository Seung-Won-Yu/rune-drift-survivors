# Late crowds change the route

The fun goal remains open. The preceding ordinary Grove/Horizon run won at4:19
with152/165 HP. After two evolutions, broad repeating routes were often safe.
One run with Dew and shields cannot establish general difficulty; it does expose
the repeated pursuit shape as a candidate for a more deliberate movement choice.

Fantasy: read a crowd's gap, sidestep into it or break the line with the acquired
weapons. This changes the obstacle inside the existing movement/breakthrough loop.
There is no new resource, screen, bonus reward or permanent upgrade.

## Contract

- The existing154- and212-second swarms use two marching ranks. Earlier packs
  and the opening remain unchanged. Existing champion, capacity and12-second
  deferral limits can still delay or skip a swarm; arrival is not guaranteed.
- Spawn positions begin320 units ahead, with the second rank46 units behind,
 34-unit column spacing and a144-unit open corridor offset72 units to a side.
  The direction commits to current travel, or a seeded direction when stationary.
  It never retargets a living formation after the player turns.
- For five combat seconds, mushrooms travel at140 units/second across that
  route, then resume ordinary pursuit at their original swarm speed. Contact
  damage, slowing, knockback, real weapon hits and real loot keep their rules.
  Existing separation can deform a rank; the corridor is not an invincible lane.
- Counts26/32, fragile HP, XP, clear reward and26-second clear window are unchanged.
  No living enemies are evicted to create a front. Pause and choice menus freeze
  the motion. Boss arrival cancels marching; distant recycling clears it too.
- The existing arrival notice explains the choice. Actual silhouettes show the
  opening; no large targeting ring or additional HUD marker is introduced.

## Verification and limits

The full269 Node rules pass. New behavioral checks cover committed movement on
two axes, the open corridor, initial distance, menu freeze, slow effect, return
to pursuit, breakable enemies/earned loot and boss cancellation. In the same
seeded isolated encounter, walking straight took contact damage(92HP), while
changing into the observed gap retained100HP; neither case killed an enemy.

Two browser cases pass at1280px desktop and390px touch viewport, covering actual
rendering, freeze/resume, the existing field label and no outer overflow. An
agent-controlled in-app browser walkthrough also sidestepped and crossed the
gap at100HP. This was the disposable DEV `march-front` scene, not an ordinary
run from departure. It cannot overwrite the player's saved profile.

Nine current-version simulations used three companions and seeds7/42/101 with
the existing pilot and ready-breakthrough policy. All ended within300 combat
seconds and stayed within enemy/projectile/effect caps. Ash won2/3, Ember3/3;
Grove survived to the deadline in3/3 without defeating the boss. Fronts appeared
twice in the Ash/Ember samples and once in each Grove sample. These are smoke
observations, not a controlled baseline comparison or proof of balance/fun.

Artifacts are under `output/playwright/survivor/march-*`. Human feedback and a
new ordinary full run remain needed: does the player change course on seeing
the front, and does that create an interesting choice after evolution?
