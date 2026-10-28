# Combat spectacle

The player found the first flow rework insufficient: combat still lacked scale
and spectacle. The first three-weapon prototype was directionally right but
needed to be bolder. This pass changes real attack patterns and crowd clearing.

## Playable attacks

- Ash's charged cleave releases three piercing blades from the starting weapon.
  Dawn expands it to five blades in a broader fan; they return toward the moving
  player, cutting each enemy at most once per outbound/return pass. Ordinary
  Dawn swings retain one outbound blade. Partial projectile capacity prioritizes
  the centre blade. Charged Dawn blades each deal 25% sword damage per pass.
- Ember's charged impact splits into three fragments for 50% of the parent shot's
  damage. They skip the original victim. Comet fragments also make small secondary
  explosions; Wildfire fragments retain their burn identity. Children cannot
  split again, and blast checks also exclude the original victim.
- Grove's real guard activation launches eight radial piercing rune shards for
  45% rune damage each, up to three targets per shard. The shield and its charge /
  cooldown remain the same. Lunar's periodic area hit appears as eight outward
  curved blades instead of a complete outline circle.

The larger silhouettes follow these attacks: long hollow sword ribbons, bright
velocity-aligned flame heads, broad organic bursts and distinct crystal volleys.
Rune wakes remain broken and short so they do not resemble a range indicator.
Enemy warnings retain the final world layer above friendly attacks.

## Rhythm and impact

Ordinary reinforcements arrive in groups of 1 initially, 2 after 15 seconds, 3
after 70 and 4 after 180. Boss reinforcements remain one at a time. This gives the
new attacks real crowds to break rather than empty screen space to decorate.

Five kills in one simulation update, or an elite defeat, can trigger 45ms of
hit stop and a bounded camera impulse. All simulation clocks, input movement,
hazards and weapon timers stop together; pause also freezes the remaining stop.
The same simulation rules apply with reduced motion, which removes the camera
movement. Growth and encounter reward menus clear a pending impact so controls resume
immediately after choosing. The camera kick is at most six pixels and lasts 160 simulation ms;
another impact cannot trigger for 600ms. Hurt / boss / elite audio keeps priority.

Floating damage text stays capped at eight even after the enemies that created
it have died. Sparse groups below the cap keep all their values. This avoids a
wall of numbers hiding the actual kill sequence.

## Verification and open judgment

211 Node tests passed, including real fan damage, five-blade evolution, partial
capacity, one hit per return pass, moving-player recall, fragment recursion and
victim exclusion, eight-way guard release, hit-stop timing and pause behavior.

Seventeen targeted browser checks passed: ordinary opening/harvest at three
viewport shapes, visible player / enemy-warning layers, hollow slash coverage,
number budgeting, boss HUDs and sustained load. The desktop browser's sustained
fixtures at 1280×720, 390×844 and 740×360 reported p95 16.7ms and no frame above
50ms. This is not a physical-phone performance claim.

The 18 automated ordinary-rule comparisons are saved locally as
`output/playwright/survivor/flow-spectacle-final.json`; the six Ash routes produced 4 boss victories, 2 time survivals and 0 deaths;
Ember 4 victories, 0 survivals and 2 deaths; Grove 4 victories, 2 survivals and 0 deaths. These are balance signals, not
human enjoyment scores. The whole-run fun objective remains open.

Development-only visual scenes `?preview=spectacle-blade`, `spectacle-flame` and
`spectacle-rune` place thirty enemies to inspect the attack sequences. They use a
disposable profile. Clips under ignored `output/playwright/survivor/spectacle/`
show these controlled scenes, not an ordinary completed chapter.
