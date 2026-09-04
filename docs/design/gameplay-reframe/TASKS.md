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

## Slice 21 — Run readability and build telemetry

- [x] Announce all four five-minute run-phase transitions once without changing combat tuning.
- [x] Add a dedicated procedural phase-change audio cue and accessible live status semantics.
- [x] Add a deterministic phase-transition QA route and pure boundary assertions.
- [x] Rank the top three damage sources by total share and DPS on the result screen.
- [x] Keep the damage breakdown visually quiet and readable at desktop and 360 × 740 mobile sizes.
- [x] Make touch controls available at narrow web widths even when pointer media detection is unreliable.
- [x] Pass the production build, 32-test browser suite, and Codex in-app visual review.

## Slice 22 — Repeatable balance sampling

- [x] Expose an immutable development snapshot for run, build, circuit, and damage data.
- [x] Add a headless live-loop sampler for storm-chain, blade-nova, and orb-pierce routes.
- [x] Record a fixed-seed five-minute baseline with progression, survival, damage share, and frame metrics.
- [x] Match orbit-blade collision to its rendered XZ footprint instead of a zero-size 3D point.
- [x] Prevent piercing projectiles from spending multiple hits on the same target.
- [x] Keep guided replay families in the early draft after their first-seal unlock.
- [x] Add close-combat behavior and route-aware card selection to the sampler.
- [x] Pass the production build, 36-test browser suite, and Codex in-app combat review.
- [x] Collect two additional post-fix five-minute seeds before applying raw weapon multipliers.
- [x] Decide whether blade needs active reach or defensive-contribution telemetry after post-fix samples.

## Slice 23 — Route identity and traversal combat

- [x] Record per-phase weapon damage, post-mitigation damage taken, and actual healing.
- [x] Preserve separate balance artifacts for non-default random seeds.
- [x] Collect two five-minute post-correction seeds across all three guided routes.
- [x] Share one orbit-radius calculation between blade rendering, collision, and QA movement.
- [x] Reserve an early draft slot for an available synergy partner before unrelated weapon families.
- [x] Add a bounded mid-range blade sweep so objective travel does not suppress the melee route.
- [x] Recompare all three routes at 60 seconds before changing raw weapon multipliers.
- [x] Pass the production build, 39-test browser suite, and Codex in-app combat review.
- [ ] Verify touch feel and blade-sweep readability on physical iOS and Android devices.

## Slice 24 — Saturation and pursuit balance

- [x] Split damage taken and actual healing into the same five phase buckets as outgoing damage.
- [x] Capture a post-sweep five-minute reference before changing storm or enemy behavior.
- [x] Bound fully upgraded storm strikes and distinct targets without changing base damage multipliers.
- [x] Cap chain target count, prevent negative late-chain falloff, and protect its minimum cooldown.
- [x] Give runners a short, capped predictive pursuit direction without extending contact reach.
- [x] Verify the combined changes in a second full five-minute three-route sample.
- [x] Keep all three routes within a comparable final DPS and survival band.
- [x] Pass the production build, 41-test browser suite, and Codex in-app combat review.
- [ ] Recheck opening pursuit feel and touch dodging on physical iOS and Android devices.

## Slice 25 — Result survival record

- [x] Convert incoming-damage and actual-healing telemetry into a compact result summary.
- [x] Identify the highest-damage run phase from the same five phase buckets used by balance QA.
- [x] Keep the survival record subordinate to build contribution and the replay recommendation.
- [x] Make QA result fixtures internally consistent so phase totals match run totals.
- [x] Cover the normal and no-hit summaries with deterministic assertions.
- [x] Verify the result hierarchy at desktop and 360 × 740 mobile sizes without opening an external browser.
- [x] Pass the production build and complete 42-test browser suite.

## Slice 26 — Dodgeable opening pressure

- [x] Use phase defense telemetry to confirm that the first 145 seconds were usually damage-free.
- [x] Increase only runner approach speed through a bounded curve that peaks before late-game density.
- [x] Keep player speed, contact reach, windup, base damage, spawn count, and simulation budgets unchanged.
- [x] Prioritize hit feedback over dash and crisis notices and remove duplicate damage wording.
- [x] Suppress lower-priority guidance during the short hit response window.
- [x] Align the mobile hit row to the vitals panel and verify its viewport bounds at 360 × 740.
- [x] Re-run a three-route 145-second pressure sample and a complete five-minute balance sample.
- [x] Pass the production build, complete 44-test browser suite, and Codex in-app route check.
- [ ] Recheck dodge timing and thumb response on physical iOS and Android devices.

## Slice 27 — Future-safe module boundaries

- [x] Keep existing runtime import paths as stable facade modules.
- [x] Separate normal game state from deterministic QA fixtures.
- [x] Separate run objectives/onboarding from scoring and result summaries.
- [x] Split weapon casting into orb, blade, storm, lightning, and nova modules.
- [x] Separate enemy core, common-role, threat, and ground-aura presentation.
- [x] Separate field pickups from Rune Shrine presentation.
- [x] Split HUD and overlay CSS by screen responsibility without changing cascade order.
- [x] Pass the production build, complete 44-test browser suite, and three-route five-minute balance sampler.

## Slice 28 — Game-first UI/UX unification

- [x] Confirm that deployable Blender/GLB assets and runtime model loaders remain absent.
- [x] Replace the pause dashboard grid with a run-identity-first composition.
- [x] Consolidate result damage and survival telemetry into one compact combat record.
- [x] Add named modal semantics, initial focus, focus return, and contained Tab navigation.
- [x] Protect HUD and pause-menu restarts with a timed two-step confirmation.
- [x] Remove false keyboard-button semantics from the drag-only touch joystick.
- [x] Raise critical mobile HUD text sizes and structurally attach hit alerts to the vitals row.
- [x] Pass the production build and complete 46-test background browser suite.
- [ ] Verify dialog focus, thumb reach, safe areas, and restart confirmation on physical iOS and Android devices.

## Slice 29 — HUD icon and entry coherence

- [x] Replace mixed Unicode action, vital, and dash glyphs with one code-built stroke SVG family.
- [x] Reframe loading as a Rune Circuit entry with identity, status, progress, and recovery states.
- [x] Add semantic progress values to health, experience, run time, boss health, and loading.
- [x] Give pointer, keyboard, and assistive-click dash input the same visible pressed feedback.
- [x] Keep the complete HUD and touch controls inside a 320 × 568 viewport.
- [x] Pass the production build and complete 47-test background browser suite.
- [ ] Verify loading transition and touch press feedback on physical iOS and Android devices.

## Slice 30 — Combat signal hierarchy

- [x] Give live objectives, encounter events, and boss patterns distinct rune markers and layouts.
- [x] Promote boss vitality and the active cast above phase metadata.
- [x] Remove duplicated crisis, threat, pickup, and coach copy while an encounter already owns the screen.
- [x] Preserve immediate damage and dash feedback during boss and encounter states.
- [x] Add semantic live-objective progress and deterministic objective QA state.
- [x] Keep the boss frame clear of vitals at 320 × 568 and 360 × 740.
- [x] Pass the production build and complete 48-test background browser suite.
- [ ] Verify boss cast readability and encounter duration on physical iOS and Android devices.

## Slice 31 — Threat readability and effect boundaries

- [x] Preserve danger telegraphs ahead of optional attack effects when visual pools exceed their budget.
- [x] Intensify threat rings, labels, and cues toward impact while reward and objective signals retain their short decay.
- [x] Make contact countdown rings converge on the actual attack reach and expose deterministic windup progress to QA.
- [x] Extend the threat-reference scene with charge, beam, and near-impact boss-shockwave signals on a clean frame.
- [x] Split strike effects from persistent projectile auras behind the stable `WeaponEffects.jsx` facade.
- [x] Split hit/damage feedback from danger telegraphs behind the stable `CombatFeedback.jsx` facade.
- [x] Pass the production build, focused eight-test combat regression, and complete 52-test background browser suite.
- [ ] Verify late-warning contrast and reaction timing on physical iOS and Android devices.

## Slice 32 — Web surface coherence

- [x] Audit the complete HUD, loading, upgrade, pause, result, and mobile flows against one game-first interface language.
- [x] Replace rounded dashboard panels with shared cut-corner Rune Circuit frame tokens.
- [x] Replace mixed Unicode panel and action marks with the shared code-built stroke-icon family.
- [x] Reduce quality selection from four floating cards to one segmented control surface.
- [x] Promote exactly one upgrade card per draft as the featured recommendation while keeping all choices equally selectable.
- [x] Preserve visible keyboard focus inside clipped buttons and cards.
- [x] Split pause, upgrade, and result implementations behind the stable `GameOverlays.jsx` facade.
- [x] Pass the production build, focused desktop/mobile overlay checks, native Playwright design-system verification, and complete 52-test background suite.
- [ ] Verify text rendering, touch focus, and outdoor contrast on physical iOS and Android devices.
