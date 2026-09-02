# Gameplay Reframe Tasks

## Slice 01 — Purpose and readability

- [x] Audit the current run, mobile HUD, upgrades, boss state, and stress scene.
- [x] Add a single source of truth for Rune Circuit progress and navigation.
- [x] Pace and enforce the four shrine sequence.
- [x] Distinguish active, locked, dormant, and completed shrines in the world.
- [x] Add compact circuit state to the run clock.
- [x] Replace generic phase objectives with circuit-led goals.
- [x] Tighten the follow camera and lift combat readability.
- [x] Add smoke assertions for circuit HUD and rerun the full QA suite.

## Slice 02 — Visual foundation

- [x] Establish a material-first world direction that does not depend on adding more Blender assets.
- [x] Add deterministic PBR micro-surfaces to the sculpted terrain.
- [x] Preserve imported texture maps while applying art-direction tint.
- [x] Give balanced field props coherent lit materials and contact shadows.
- [x] Remove broad terrain decals that intersected the sculpted ground.
- [x] Verify the balanced field in the in-app browser.

## Slice 03 — Choice presentation

- [x] Redesign the upgrade overlay around three dense, readable decisions.
- [x] Reduce unused panel space and improve mobile card hierarchy.
- [x] Make recommendation reasons and build-synergy changes immediately legible.

## Slice 04 — Combat identity

- [x] Give each weapon family a stronger shape, cadence, and hit signature.
- [x] Rebalance early local drops now that the circuit supplies build rewards.
- [x] Tune enemy compositions around traversal and shrine channel windows.

## Slice 05 — Run closure

- [x] Make circuit completion materially affect the final rift sequence.
- [x] Reframe result scoring around route completion, build identity, and survival.
- [x] Add a short replay prompt that exposes an alternate build path.

## Slice 06 — Web delivery and replay intent

- [x] Remove high-detail forest payloads from the default balanced startup path.
- [x] Lazy-load cinematic environment and post-processing features.
- [x] Carry the result-screen replay route into the next run.
- [x] Guarantee the recommended family at the first armory seal.
- [x] Verify build output, live stress budgets, and the guided replay flow.

## Slice 07 — Fair quality scaling

- [x] Separate combat simulation limits from render-quality profiles.
- [x] Keep enemy, projectile, and XP rules identical on low, balanced, and high.
- [x] Retain frame pressure as diagnostics without trimming live gameplay entities.
- [x] Add an in-game Auto, Performance, Balanced, and Quality selector.
- [x] Persist player-selected quality while keeping QA URL overrides deterministic.
- [x] Verify desktop, mobile, persistence, stress, and full browser regression coverage.

## Slice 08 — Honest run closure

- [x] Split run closure into full seal, incomplete-circuit survival, and defeat.
- [x] Require a completed four-seal circuit for victory and S rank.
- [x] Give incomplete survival its own result copy, mark, guidance, and grade label.
- [x] Show the current run-phase objectives in the pause screen instead of opening goals.
- [x] Surface each next seal's reward directly in the circuit HUD.
- [x] Add deterministic mid-run and survival-result QA routes.
- [x] Verify the complete outcome flow and visual hierarchy in the in-app browser.

## Slice 09 — Code-built landmark language

- [x] Replace the four low-profile seal props with one reusable gate, platform, step, and rune kit.
- [x] Give every real seal a tall silhouette, its own reward color, and an order-readable stone count.
- [x] Connect the central combat plaza to each seal with restrained ground-route markers.
- [x] Remove decorative false shrines and duplicate temporary seal props that competed with gameplay targets.
- [x] Keep a reduced but recognizable gate and route treatment in the low-quality web profile.
- [x] Verify low, balanced, and high presentation in the Codex in-app browser.
- [x] Pass the production build and complete browser smoke suite.

## Slice 10 — Code-built character cast

- [x] Define one readable Rune Warden hero language around hood, mantle, staff, and rune core.
- [x] Replace the always-loaded player character GLB with a code-built avatar.
- [x] Unify runner, golem, brute, elite, and boss into one Riftborn silhouette family.
- [x] Give enemy roles distinct proportions, paired ornaments, face runes, and movement profiles.
- [x] Remove high-quality character model requests and the obsolete source-enemy renderer.
- [x] Fix zero-model low-quality startup so the loading overlay can complete without asset requests.
- [x] Verify low, balanced, and high silhouettes in the Codex in-app browser.

## Slice 11 — 2.5D Rune Warden hero

- [x] Define a transparent four-direction sprite-atlas contract for the hero.
- [x] Generate one consistent hooded Rune Warden across back, right, front, and left views.
- [x] Replace the geometric hero body with the illustrated 2.5D sprite.
- [x] Select the atlas cell from the existing player-facing vector.
- [x] Preserve movement, dash, cast, and hurt feedback through lightweight procedural motion and color response.
- [x] Remove the old geometric cloak, crest, orbit-rune, and chest overlays that competed with the illustration.
- [x] Verify transparent compositing and combat-scale readability in the Codex in-app browser.
- [ ] Validate the sprite at outdoor brightness on physical iOS and Android devices.

## Slice 12 — Authored Rune Warden animation

- [x] Expand the hero sheet to a consistent 4-direction × 6-pose atlas.
- [x] Add separate idle A/B and opposing walk-contact frames.
- [x] Add authored cast-release and standing hurt-recoil poses.
- [x] Define state priority as hurt, cast, walk/dash, then idle.
- [x] Speed up the walk cycle during dash without changing movement simulation.
- [x] Remove the generated neutral checker background at render time without affecting colored character pixels.
- [x] Remove the superseded 4-cell runtime sprite from `public/`.
- [x] Verify idle, cast, and hurt presentation in the Codex in-app browser.
- [ ] Verify walk cadence and touch movement on physical mobile devices.

## Slice 13 — Animated common Riftborn cast

- [x] Define one shared 2.5D family language for runner, golem, and brute roles.
- [x] Generate four cardinal views and opposing walk contacts for all three common roles.
- [x] Add deterministic role, direction, and walk-frame selection.
- [x] Render every common enemy through one instanced plane draw instead of one React sprite per actor.
- [x] Preserve existing contact windup, hit reaction, ground shadow, simulation radius, and movement rules.
- [x] Keep elites and bosses on the stable code-built path for this incremental slice.
- [x] Disable source mipmaps to prevent checker-background color bleed at small enemy sizes.
- [x] Verify dense silhouette readability in the Codex in-app browser.
- [x] Pass the production build and complete browser smoke suite.

## Slice 14 — Model-free runtime

- [x] Generate four-direction movement frames for bulwark, charger, summoner, and boss roles.
- [x] Replace the remaining geometric elite and boss bodies with the shared 2.5D instanced renderer.
- [x] Keep projectiles and orbit blades code-built in every quality tier.
- [x] Remove imported forest and nature-model render paths.
- [x] Remove the runtime model manifest, preload logic, GLTF hooks, and converter command.
- [x] Delete `public/models/`, archived model packages, and Blender working files.
- [x] Require zero GLB requests in low, balanced, and high browser QA.
- [x] Update the repository, asset, QA, and art-direction documentation around the model-free contract.

## Slice 15 — Clean-edge presentation

- [x] Replace separate character background-key fragments with one shared sprite-compositing shader.
- [x] Clamp and darken partially keyed edge pixels so neutral atlas backgrounds cannot leave white halos.
- [x] Disable mipmaps and use linear filtering for every character atlas.
- [x] Reduce bright cyan-white panel outlines through quieter shared interface tokens.
- [x] Hide run objectives while an encounter notice or boss bar already owns the same attention layer.
- [x] Add browser assertions for encounter, objective, and boss HUD exclusivity.
- [x] Verify common, elite, boss, and hero edges in the Codex in-app browser.

## Slice 16 — Unified battlefield composition

- [x] Make low, balanced, and high use one authoritative terrain and landmark composition.
- [x] Remove the high-only backdrop, meadow, path, camp, biome, floor-sigil, and story-decal modules.
- [x] Remove the dead imported-nature transform generator left behind by the model cleanup.
- [x] Keep quality differences in density, lighting, shadows, atmosphere, and combat effects.
- [x] Replace the flat bright center slab with a restrained three-tier rune-stone plaza.
- [x] Verify balanced circuit readability and high-quality threat composition in the Codex in-app browser.
- [x] Pass the production build and complete browser smoke suite.

## Slice 17 — Decisive game moments

- [x] Promote every Rune Circuit activation from a small pickup toast to a dedicated seal-and-reward signal.
- [x] Add a deterministic seal-completion QA route and browser assertions.
- [x] Give encounter and boss HUDs dedicated entry motion that preserves their centered transforms.
- [x] Remove meaningless upgrade-card corner numbers and decorative corner brackets.
- [x] Stagger upgrade-card entry with restrained, reduced-motion-safe timing.
- [x] Recompose the result screen around one grade verdict instead of stacked dashboard boxes.
- [x] Replace the generic rotated-square result mark with a readable outcome seal.
- [x] Verify seal, upgrade, and victory states in the Codex in-app browser.
- [x] Pass the production build and complete browser smoke suite.

## Slice 18 — Combat signal grammar

- [x] Reserve warm open rings and countdown arcs for enemy danger.
- [x] Replace player storm outlines with restrained filled zones, radial cuts, and distinct projectile cores.
- [x] Reduce XP gem size, glow, and beacon weight so rewards do not compete with active attacks.
- [x] Separate attack, threat, reward, objective, and mobility effects with explicit runtime signals.
- [x] Remove common-enemy floor rings and keep only subtle elite/boss grounding.
- [x] Prevent boss, vitals, and alert HUD regions from overlapping at the 360 × 740 mobile viewport.
- [x] Add mobile stress-frame overflow, HUD-overlap, and simulation-budget assertions.
- [x] Verify the cleaned stress composition in the Codex in-app browser.

## Slice 19 — Procedural combat materials

- [x] Replace hard-edged projectile trail geometry with a reusable alpha-faded motion texture.
- [x] Replace the remaining storm-radius polygons with a soft radial field and broken rune strokes.
- [x] Reuse the same motion material for runner afterimages instead of solid rectangular planes.
- [x] Keep orb and storm cores distinct while reducing the storm core's tile-like footprint.
- [x] Scale XP crystal presentation by reward value without changing pickup or simulation rules.
- [x] Keep generated effect textures small, model-free, and free of new runtime asset requests.
- [x] Verify combat cadence and desktop/mobile stress density in the Codex in-app browser and Playwright.

## Slice 20 — Release polish and web cleanup

- [x] Add a readable backward anticipation and forward impact snap to contact attacks without changing collision timing.
- [x] Replace remaining pure-white combat accent lines with role-colored highlights.
- [x] Remove the non-gameplay arena atmosphere rings and the oversized middle-field guide ring.
- [x] Replace directional terrain grain with multi-scale procedural surface noise.
- [x] Reuse enemy-effect classification arrays across frames to reduce garbage collection pressure.
- [x] Convert the three runtime atlases to pixel-identical lossless WebP and remove the superseded PNG payloads.
- [x] Bring the first upgrade threshold forward while retaining the existing late-run XP growth rate.
- [x] Add deterministic checks for the opening XP curve, first three seal timings, and contact pose response.
- [x] Pass the production build, 31-test browser suite, and final Codex in-app visual review.
