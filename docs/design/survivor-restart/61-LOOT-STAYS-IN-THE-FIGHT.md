# Keep earned growth in the current fight

## Player problem

The ordinary Ember run on35720bd reached the boss but lost at4:19/LV14.
Its HUD stayed at162/217XP during a long late stretch while kills rose.
Large escape routes left earlier loot behind. This observation suggested a
capacity interaction, not proof that the player had lost XP or that the
whole game was balanced incorrectly.

A targeted full-field reproduction established the defect:240 unclaimed
historical gems far behind the player, followed by a real automatic-fire
kill at100 units. The new2XP was merged into an old gem1772 units away.
Walking through the fresh kill site awarded0XP. All482 rawXP remained on
the floor. The cap silently moved the current combat reward elsewhere,
so the player could keep fighting without making nearby growth progress.

## Change and design limits

Keep the240-gem performance limit and all ordinary loot values, pickup
ranges, attraction speeds, XP multipliers, growth costs and enemy stats.
When full, a new reward may join an unclaimed pile within32 units. If no
such local pile exists, compact the closest old pair with matching pickup
flags, then place the new gem at the actual death position. The old pair's
raw values add and its position becomes their value-weighted centre.
Matching ordinary-attraction/recall flags keep caught and untouched loot
separate. Newly dropped distant XP never inherits a returning gem's pickup
state. With240 entries and four flag combinations, a compatible old pair
always exists. Compaction occurs only for distant overflow; ordinary drops
below capacity are unchanged.

The intended loop is still kill → cross into the earned loot → choose a
power → use it. There is no free XP, global magnet, additional drop count,
or passive level grant. Backtracking for genuinely old loot remains a route
choice. At capacity, old local markers can coalesce; a sparse full field
can also move the closest pair to its centre. The new fight reward remains
locally collectible rather than being redirected across the map.

## Verification

-295 Node rules pass. New actual-kill cases cover full old fields, a local
  pile, attracted/recalled/mixed histories, conservation by pickup state,
  collection-only bonuses and raw-XP Dew healing exactly once.
-11 focused browser flows pass: full-capacity kill/approach/collection at
  1280×720,390×844 and740×360, existing caught-pickup continuity, breakthrough
  harvest and ordinary opening-to-swarm growth. No outer-page overflow.
-The in-app isolated loot-cap scene uses the actual automatic attack and
  movement:1 kill/0XP before approach,2XP after crossing the drop. It uses
  authored capacity/target preconditions, not ordinary-run balance evidence.
  No captured browser errors/warnings. Preview storage is disposable.
-Pages build and production smoke pass, including both entry URLs, saved
  progression, artwork, codex and absence of development QA hooks.
-An18-pair automated chapter comparison uses the same pilot, actual offers,
  seeds7/42/101 and both branches for each companion on1b38c18 and this
  change. All paired outputs are identical,13/18 boss victories per version.
  Maximum floor count is145, so these runs establish unchanged behavior
  below capacity; they do not exercise overflow or estimate human fun.
-A separate full-field stress uses550 authored real-projectile kills per
  version,50 warmups then500 measured updates. Baseline0/500 drops remain
  at the fresh kill site; revised500/500 do. Both preserve482 rawXP and240
  gems per case. Revised Node update median0.085ms/p950.130ms versus
  baseline0.037/0.073ms on this machine. This is an isolated CPU check,
  not browser/mobile frame-rate proof.

Evidence:ignored output/playwright/survivor/local-loot-*; the original
ordinary report is manual-ember-ordinary-play.md. The broad fun goal stays
open: ordinary post-change play and human feedback must still assess how
combat decisions, loot routes and meaningful growth fit together.
