# Gameplay Reframe Review

## Slice 01 — Rune Circuit

### Delivered

- Replaced independent shrine activation with a paced, sequential four-seal Rune Circuit.
- Added a pure circuit-state module for progress, next target, world position, direction, distance, readiness, and completion.
- Moved the seals into a readable traversal route and aligned each unlock with a run phase.
- Added active, locked, dormant, channeling, and completed world treatments.
- Added circuit navigation to the central clock and changed run objectives to follow the route.
- Limited the large first-run coach to the opening 32 seconds and compacted its mobile form.
- Tightened the camera, lifted world lighting, reduced the vignette, and reduced the oversized spawn plaza.
- Added a deterministic `?qa=circuit&quality=balanced` scene and browser assertions.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 12/12 passed, including local real-time stress thresholds.
- Pure circuit assertions covered locked first state, ready second state, and complete state.
- Visual review covered desktop HUD, mobile HUD, ready seal, boss HUD, upgrade overlay, and result overlay.

### Known follow-ups

- Circuit completion improves scoring and rewards but does not yet change the final boss sequence.
- Physical iOS and Android verification is still required before release.

## Slice 02 — Visual foundation

### Delivered

- Added deterministic, seamless terrain albedo, normal, and roughness textures without introducing an external texture pipeline.
- Increased balanced/high terrain resolution and corrected texture color-space handling.
- Preserved embedded GLB maps while applying controlled palette tints.
- Replaced unlit balanced environment materials with rough PBR materials.
- Added balanced anti-aliasing, bounded dynamic shadows, and a clearer key/fill lighting hierarchy.
- Removed broad flat decals that intersected the terrain and caused broken polygon fields.
- Recorded a material-first art direction and the limited future role of Blender assets.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 12/12 passed, including the stress budget scene.
- In-app balanced-quality review covered initial field readability, surface continuity, prop material response, and contact grounding.

### Known follow-ups

- The four seals still mix several primitive languages and should become the first coherent authored landmark kit.
- Fine ground scatter needs a distance-based grass/pebble layer once the current performance baseline is profiled on physical phones.
- The world now has a stable material base, but color grading and fog still need a dedicated final-look pass.

## Slice 03 — Choice presentation

### Delivered

- Rebuilt the upgrade cards around one compact decision path: recommendation, build family, effect, stat change, and selection.
- Replaced the oversized vertical family rail and empty sigil stage with a thin rarity rail and a compact icon-and-copy row.
- Turned the stat change into a tinted callout so the gameplay consequence reads before secondary tags.
- Reduced desktop panel width and card height while preserving three side-by-side choices.
- Added a dedicated mobile hierarchy that fits all three choices within a 390 × 844 viewport without page scrolling.
- Kept the existing interaction and smoke-test hooks while simplifying the component structure.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 12/12 passed, including upgrade selection and the stress budget scene.
- In-app desktop review at 1280 × 720: 468px panel height and 258px card height, with all choices visible.
- In-app mobile review at 390 × 844: three 172px cards and no document overflow.
- Keyboard focus was left untouched by using only the Codex in-app browser in the background.

### Known follow-ups

- Upgrade selection still needs sound, press, and confirm feedback to match the clearer visual decision hierarchy.
- A future reward-art pass can replace the current glyphs after the weapon-family identity work is settled.
- Physical-device touch verification is still required before release.

## Slice 04 — Combat identity

### Delivered

- Kept the established weapon cadence while giving orb, storm, blade, lightning, and nova distinct impact geometry.
- Added weapon-specific cast timbres: quick orb, heavy storm, sharp lightning, and long low nova.
- Increased the balanced-quality feedback allowance from three to five hit bursts and from one to two weapon effects.
- Added a live `?qa=combat&quality=balanced` fixture with fixed near, mid, and far targets and per-source damage telemetry.
- Removed the 42-second starter cache so the first Rune Circuit seal owns the run's opening build reward.
- Added route, approach, and channel encounter profiles: traversal favors pursuit, while active seal channel windows defer new surges, elites, and bosses.

### Verification

- `npm run build`: passed.
- Focused combat smoke: all five weapon damage sources registered within the live QA fixture.
- Pure encounter-profile assertions covered route, approach, channel, and completed-circuit states.
- In-app balanced-quality review covered the live five-weapon fixture without opening an external browser.

### Known follow-ups

- Physical-device audio latency and simultaneous-effect readability still need verification.
- Enemy compositions now respect circuit windows, but the exact target/spawn multipliers need playtest telemetry rather than visual QA alone.

## Slice 05 — Run closure

### Delivered

- Converted a completed four-seal circuit into a real finale modifier instead of a result-only counter.
- Added 16% outgoing damage, 8% faster weapon cadence, and 14% incoming-damage reduction after circuit completion.
- Weakened the final circuit-exposed boss with 12% less health, slower patterns, fewer summons, and shorter guard duration.
- Reweighted the 100-point run grade around survival (40), circuit route (30), build identity (25), and combat bonus (5).
- Rebuilt the result hierarchy so the three core score pillars appear before secondary combat statistics.
- Added a next-run prompt that recommends an alternate two-family build route based on the previous dominant weapon.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 14/14 passed in background mode, including the stress budget scene.
- Pure finale assertions covered inactive and completed-circuit modifier states.
- Pure result assertions covered an S-grade victory, full survival/circuit scores, and the alternate blade route.
- In-app result review at 494 × 998 measured a 578px panel with no clipped content.
- Result smoke assertions cover score pillars, 100-point grade, replay prompt, and route-specific restart copy.

### Known follow-ups

- The exact finale bonuses should be retuned after full five-minute playtest telemetry.
- A later meta-progression layer can make the suggested replay family influence the first guaranteed armory choice.
- Physical iOS and Android result-screen verification is still required before release.

## Slice 06 — Web delivery and replay intent

### Delivered

- Removed the four large imported forest GLBs from the default balanced scene and preload path while keeping them available in high quality.
- Moved cinematic environment lighting and post-processing behind a dynamic import so balanced players do not preload disabled effects.
- Turned the result-screen alternate build recommendation into a next-run route intent.
- Guaranteed that route's weapon family when the first armory seal grants its build reward.
- Added a short opening alert confirming which family is reserved.

### Verification

- `npm run build`: passed; the 17.56 kB gzip effects vendor chunk is no longer module-preloaded by the default document.
- The balanced startup request guard confirmed that none of the four Quaternius forest GLBs are fetched, avoiding 10,495,740 bytes of optional model payload on the default path.
- `npm run qa:smoke`: 16/16 passed in background mode, including console guards, the live stress threshold, the guided restart, and first-armory family guarantee.
- In-app review covered the compact balanced battlefield, the guided replay alert, and the lazy `high&fx=on` path.

### Known follow-ups

- Physical phones still need cold-cache loading and GPU-frame profiling before a public release target is set.
- The imported high-detail forest assets should eventually be mesh-compressed rather than shipped as raw multi-megabyte GLBs.
- Persistent unlocks and long-term currency remain intentionally out of scope for this session-level replay intent.

## Slice 07 — Fair quality scaling

### Delivered

- Replaced quality-specific enemy, projectile, and XP caps with one balanced simulation budget: 40 enemies, 30 projectiles, and 56 XP gems.
- Stopped frame-pressure adaptation from deleting or suppressing live gameplay entities; pressure remains available in QA telemetry.
- Kept the existing visual budgets and frame gates responsible for optional auras, accents, effects, numbers, and update cadence.
- Added a pause-menu selector for Auto, Performance, Balanced, and Quality modes with local persistence.
- Kept deterministic `quality` URL flags as a visible, locked override for development scenes.
- Clarified in the UI that quality changes do not alter combat rules.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 18/18 passed in background mode.
- Pure assertions confirm identical simulation budgets for low, balanced, and high.
- Browser assertions cover live mode switching and persistence across reload.
- The stress fixture still stays within the fixed simulation budget and meets the local real-time frame threshold.
- In-app review covered the full desktop pause layout, selected state, Performance-mode shell transition, and return to Auto without opening an external browser.

### Known follow-ups

- Physical phones still need sustained thermal and battery profiling to tune visual-only fallbacks.
- Auto mode currently resolves conservatively; device-tier telemetry should guide any future expansion beyond the balanced default.
- High-detail assets still need mesh compression before Quality mode is appropriate as a general default.

## Slice 08 — Honest run closure

### Delivered

- Replaced the unconditional 300-second victory with a circuit-aware completion contract.
- A full four-seal circuit now produces `victory`; reaching five minutes with missing seals produces `survived`; losing all HP remains `defeat`.
- Added a dedicated survival-result presentation with the next missing seal, separate mark, and `생존 귀환` grade language.
- Reserved S rank for complete circuits so a high combat score can no longer imply a sealed rift when the route is unfinished.
- Changed the pause ledger to use the current run phase's objectives instead of repeating the opening checklist.
- Added the next seal's reward to the compact circuit HUD before distance and readiness.
- Added deterministic `?qa=objectives&quality=balanced` and `?qa=survived&quality=balanced` scenes.

### Verification

- `npm run build`: passed.
- `npm run qa:smoke`: 21/21 passed in background mode.
- Pure assertions cover both sealed and incomplete five-minute frame outcomes.
- Browser assertions cover current-phase pause objectives, reward copy, survival result copy, circuit score, and grade language.
- In-app review covered the 82-point `A · 생존 귀환` result and the 3/4 ASCENT pause ledger without opening an external browser.

### Known follow-ups

- Full five-minute player telemetry is still needed to confirm that four-seal completion is achievable without over-directing movement.
- The result replay suggestion still prioritizes an alternate build family; a later iteration can also recommend a missed seal route.
- First-session coaching still resets every run and should move to a small persistent profile before meta progression is introduced.

## Slice 09 — Code-built landmark language

### Delivered

- Built the four actual Rune Circuit seals from a shared code-native kit: octagonal base, raised dais, approach steps, twin pylons, lintel, colored caps, and seal-order stones.
- Added lightweight diamond route markers from the central plaza toward every seal so navigation is part of the terrain language instead of only a HUD arrow.
- Removed the unrelated high-quality decorative shrines and the older per-seal placeholder slabs/crystals, leaving one authoritative landmark system.
- Kept low quality intentionally sparse with two steps and two route marks per seal while preserving the same gate silhouette and gameplay positions.
- Used instanced primitives and existing materials, so the visual upgrade adds no new model download or Blender dependency.

### Verification

- `npm run build`: passed with 699 transformed modules.
- `npm run qa:smoke`: 22/22 passed, including the new landmark-layout contract and stress fixture.
- Pure assertions cover four bases, eight pylons and caps, four lintels, order-stone counts, and balanced/low route-marker budgets.
- Codex in-app browser review covered low, balanced, and high `?qa=circuit` scenes without opening or focusing an external browser.

### Known follow-ups

- The gate currently uses a clean primitive silhouette; a later material-only pass can add chipped edges or vertex-color wear without replacing it with a large imported model.
- Route-marker brightness should be retuned after full-run playtests, especially during dense enemy and effect overlap.
- Physical mobile GPU and outdoor-brightness checks remain required before finalizing the low-quality contrast target.

## Slice 10 — Code-built character cast

### Delivered

- Replaced the always-loaded wizard model with a project-authored Rune Warden assembled from a hood, five-sided cloak body, asymmetric mantle, staff crystal, face slit, and build-colored chest rune.
- Unified every render quality around one Riftborn cast instead of swapping to unrelated imported creatures in Quality mode.
- Reworked role silhouettes: runners are low blade forms, golems are shoulder-heavy stone forms, brutes use a wide horned front, elites carry tall paired crowns, and bosses read as oversized crowned altars.
- Added faceted lit surfaces while retaining instanced rendering and quality-scaled shadow cost.
- Removed the obsolete source-enemy renderer and all player/enemy model entries from the active manifest and preload groups.
- Fixed the loading overlay so a low-quality scene with zero model requests reaches gameplay instead of staying at 4%.

### Verification

- `npm run build`: passed with 698 transformed modules.
- `npm run qa:smoke`: 24/24 passed, including all low, balanced, high, mobile, combat, outcome, and stress checks.
- Focused browser checks cover zero-model low startup, balanced hero delivery, high-quality character-model exclusion, enemy contact, weapon damage sources, and the live stress budget.
- Codex in-app review covered the low, balanced, and high silhouette fixtures without opening or focusing an external browser.

### Known follow-ups

- Resolved in Slice 14: the retired character GLBs and runtime model pipeline were removed.
- Resolved in Slice 12: the hero now has authored idle, walk, cast, and hurt poses.
- Physical-device testing is still needed to tune the smallest face-rune and crown details for outdoor phone brightness.

## Slice 11 — 2.5D Rune Warden hero

### Delivered

- Replaced the geometric Rune Warden body with a transparent hand-painted 2.5D character atlas containing four cardinal views.
- Added a small runtime contract that maps the player's facing vector to stable back, right, front, and left atlas cells.
- Kept animation code-native: movement adds a restrained bob and lean, dash stretches the silhouette, casting adds a build-colored pulse and arc, and damage adds a brief red guard response.
- Removed the previous cloak, crest, halo, chest gem, and orbit-rune geometry so the illustrated character remains the single authoritative hero silhouette.
- Kept all render qualities on the same hero asset; quality changes only the presentation budget and sprite scale.

### Verification

- `npm run build`: passed with 699 transformed modules.
- `npm run qa:smoke`: 25/25 passed in background mode.
- Smoke assertions cover sprite delivery, absence of the retired player GLB, all four atlas offsets, loading, desktop movement, mobile controls, combat, outcomes, and the stress budget.
- Codex in-app browser review confirmed transparent compositing and readable separation from the Riftborn cast in the dense silhouette fixture.
- A second in-app review confirmed the hood, staff, cyan rune, and overall silhouette remain readable in the narrower normal circuit composition.

### Known follow-ups

- The current atlas is a single-frame-per-direction foundation. A later animation atlas can add authored idle, walk, cast, and hurt frames without changing the facing contract.
- The Riftborn enemies intentionally remain code-built geometric silhouettes; they are the next candidates for a matching 2.5D sprite treatment.
- Resolved in Slice 20: all three runtime atlases now ship as pixel-identical lossless WebP.

## Slice 12 — Authored Rune Warden animation

### Delivered

- Expanded the Rune Warden from four static cardinal cells to a 24-cell atlas: four directions across idle A/B, walk A/B, cast, and hurt rows.
- Added a pure frame-selection contract with deterministic timing and the priority order hurt, cast, walk/dash, then idle.
- Connected live velocity, facing, dash time, cast pulse, and hurt pulse directly to authored character poses.
- Kept procedural scaling and combat accents as secondary feedback while the character's limbs, staff, and cloak now change pose in the atlas itself.
- Added a narrow neutral-background key to the SpriteMaterial because the generated atlas exported without an alpha channel despite two transparent-background requests.
- Removed the superseded four-cell PNG from the deployable `public/` tree; its generated source remains recoverable outside the runtime asset set.

### Verification

- `npm run build`: passed with 699 transformed modules.
- `npm run qa:smoke`: 25/25 passed in background mode.
- The focused frame-contract test covers every direction, both idle frames, both walk frames, cast, and hurt priority.
- Codex in-app browser review confirmed clean background removal in the standard circuit scene, visible cast-pose changes in the combat fixture, and the hurt pose in the contact fixture.

### Known follow-ups

- Physical phone testing is still needed to tune walk cadence against touch-joystick movement and outdoor brightness.
- The RGB source is larger than an equivalent alpha-aware WebP; replace the runtime shader key when a visually identical true-alpha export is available.
- More authored walk frames would improve slow movement, but the current two-contact cycle is intentionally compact for this web target.

## Slice 13 — Animated common Riftborn cast

### Delivered

- Replaced the geometric runner, golem, and brute bodies with one 24-cell hand-painted 2.5D atlas while keeping their gameplay definitions unchanged.
- Gave runners a narrow blue-black blade silhouette, golems a squat moss-stone silhouette, and brutes a broad rust-red horned silhouette.
- Added two opposing walk contacts and four cardinal views per role, selected from existing facing, animation phase, and movement intent.
- Batched all common actors into one instanced plane renderer with per-instance UV offsets and role tints, avoiding one draw call or React component per enemy.
- Preserved the existing elite and boss geometric renderer as a stable second path, allowing the common-cast conversion to remain independently reversible.
- Disabled texture mipmaps for the RGB checker source after in-app QA showed pale background pixels bleeding into heavily minified enemies.

### Verification

- `npm run build`: passed with 700 transformed modules.
- `npm run qa:smoke`: 26/26 passed in background mode.
- Pure assertions cover runner, golem, brute, all four directions, alternating walk contacts, stationary-frame hold, and the safe unknown-role fallback.
- Codex in-app browser review covered the 40-enemy silhouette fixture and confirmed separate runner, golem, and brute size/color reads without opening an external browser.

### Known follow-ups

- Elite and boss illustration/animation remain the next visual-consistency slice.
- True-alpha source exports would allow mipmaps and cleaner subpixel edges; the current neutral-key path intentionally favors stable color over aggressive minification.
- Physical mobile testing is still required for shimmer, thermal load, and outdoor brightness at the smallest runner scale.

## Slice 14 — Model-free runtime

### Delivered

- Added a 32-cell threat atlas covering bulwark, charger, summoner, and the Rift Warden boss across four directions and two movement contacts.
- Moved every Riftborn role onto two instanced sprite draws while preserving collision radii, movement rules, contact attacks, hit flashes, guard state, telegraphs, and ground shadows.
- Unified orb, storm, and orbit-blade rendering around the existing code-built presentation for every quality tier.
- Removed the imported nature and forest components, model instance adapter, GLTF loader hook, preload groups, conversion script, and npm conversion command.
- Deleted the deployable `public/models/` tree together with ignored archived model packages and Blender working files. Tracked removals remain recoverable from Git history; ignored local source files are intentionally not retained.
- Updated the runtime contract so `public/sprites/` is the complete deployable visual-asset inventory.

### Verification

- `npm run build`: passed with 696 transformed modules after both the threat-cast replacement and model-loader removal.
- `npm run qa:smoke`: 27/27 passed in background mode.
- Pure assertions cover every elite role, the boss, four-direction mapping, alternate movement contacts, stationary hold, and fallback behavior.
- Browser request guards require zero `.glb` requests in low, balanced, and high quality.
- Codex in-app browser review confirmed clean neutral-background removal and readable bulwark, charger, summoner, and boss scale separation in the dedicated `?qa=threats` scene.

### Known follow-ups

- The generated threat atlas is RGB with a baked neutral checker, so it uses the same shader key and no-mipmap treatment as the common cast.
- Physical mobile checks remain necessary for boss scale, sprite shimmer, thermal load, and outdoor brightness.
- A future true-alpha export can simplify both enemy materials without changing the frame contracts.

## Slice 15 — Clean-edge presentation

### Delivered

- Consolidated the hero, common-enemy, elite, and boss neutral-background treatment into one shared shader fragment.
- Tightened the alpha transition and applied edge despill so pale filtered pixels become transparent or inherit a dark silhouette edge instead of reading as a white contour.
- Disabled player-atlas mipmaps to match the existing enemy treatment and kept linear sampling for stable web rendering.
- Softened the global panel-line colors from bright cyan-white to muted green-stone values while preserving a strong keyboard focus ring.
- Made the central encounter notice, run-objective dock, and boss bar mutually exclusive so alerts no longer stack into a wall of framed UI.

### Verification

- Production build passed after the shared shader and HUD changes.
- Codex in-app browser review covered `combat`, `silhouette`, and `threats` scenes at balanced/high quality without opening an external browser.
- Browser smoke coverage now asserts that combat encounters suppress the objective dock and the boss HUD suppresses both competing layers.

### Known follow-ups

- The runtime compatibility shader is intentionally conservative because character art contains real pale stone and gold highlights. True-alpha source atlases remain the cleanest eventual replacement.
- Physical mobile testing is still needed for subpixel shimmer, outdoor brightness, touch comfort, and sustained thermal load.

## Slice 16 — Unified battlefield composition

### Delivered

- Replaced the separate high-quality backdrop branch with the same restrained arena composition used by the balanced web target.
- Removed six legacy high-only modules that layered broad planar decals and unrelated camps, paths, biome props, and sigils over the sculpted terrain.
- Removed the unused imported-nature transform generator that no longer had a renderer after the model-free conversion.
- Rebuilt the central combat plaza as three nested dark-stone tiers with restrained gold and mint inlays, reducing its previous flat olive-board appearance.
- Kept high quality meaningful through higher terrain resolution, stronger lighting, dynamic shadows, atmosphere, presentation effects, and render cadence rather than a competing scene layout.

### Verification

- Codex in-app browser comparison confirmed that the high-quality threat scene no longer contains the large black terrain intersections visible in the retired branch.
- The balanced circuit scene keeps the first-seal route, player silhouette, onboarding prompt, and destination gate readable around the darker central plaza.
- `npm run qa:smoke`: 27/27 passed, including low/high startup, desktop combat, 360 × 740 touch controls, quality persistence, outcomes, and stress budgets.

### Known follow-ups

- Physical mobile testing remains necessary for sustained thermal behavior and the lowest-brightness play conditions.
- Future environment additions should extend `BalancedFieldArena` or a shared replacement instead of creating another quality-specific battlefield graph.

## Slice 17 — Decisive game moments

### Delivered

- Added one shared shrine-activation alert contract that names the connected seal, circuit step, and earned reward for every reward branch.
- Added a deterministic `?qa=seal` scene so completion hierarchy can be inspected without manually channeling a shrine.
- Replaced generic vertical entry motion on centered combat signals with dedicated transform-safe encounter and boss animations.
- Removed decorative upgrade-card indices and corner brackets, then added a short sequential entry that still collapses under reduced-motion preferences.
- Rebuilt the result hierarchy around a single large grade verdict, unframed run facts, and quieter highlight dividers instead of several nested dashboard cards.
- Replaced the ambiguous rotated-square result ornament with an outcome-colored circular seal and readable outcome glyph.

### Verification

- Codex in-app browser review covered the new first-seal signal, the cleaned three-choice upgrade board, and the victory result hierarchy.
- The seal signal suppresses the objective dock while active and leaves the next circuit destination visible in the stable top HUD.
- The background browser suite verifies the result verdict and replay action at the 360 × 740 touch viewport in addition to the desktop outcome routes.
- `npm run qa:smoke`: 28/28 passed; a final focused rerun also passed the seal, mobile-result, and desktop-result cases after the replay-seal cleanup.

### Known follow-ups

- Physical touch-device review remains necessary for result-screen scroll length and one-handed upgrade selection.
- Reward-pick confirmation can receive a short world-space pulse in a later slice if it remains visually distinct from level-up and shrine effects.

## Slice 18 — Combat signal grammar

### Delivered

- Reassigned each combat effect to a stable shape family: enemy threats use warm open rings and countdown arcs, player attacks use filled pulses and short radial cuts, and rewards/objectives use diamond marks.
- Split orb and storm projectile cores into separate instanced meshes, replaced rectangular trail planes with tapered triangles, and removed the redundant per-projectile spark-ring draw.
- Removed the oversized full storm halos that made high-density combat look like overlapping prototype circles.
- Reduced XP crystal scale, emissive weight, pulse amplitude, and high-quality beacon prominence while keeping the same pickup and simulation rules.
- Replaced common-enemy ground outlines with subtle filled grounding reserved for elites and bosses.
- Marked reward, objective, mobility, attack, and threat effects at their runtime sources so presentation no longer infers meaning from color alone.
- Reflowed the portrait boss HUD so vitals, the boss bar, and the single highest-priority alert occupy separate vertical regions.

### Verification

- Codex in-app browser review covered the balanced stress, threat-identity, and contact fixtures without opening or focusing an external browser.
- The 360 × 740 mobile stress fixture now asserts zero document overflow, zero overlap between vitals/boss/alert regions, and unchanged projectile/XP simulation caps.
- The production build and complete browser smoke suite pass with the new combat presentation and mobile assertions.

### Known follow-ups

- Physical-device testing remains necessary for OLED brightness, touch-hand occlusion, sustained thermal load, and the shortest enemy windup windows.
- A future authored VFX atlas could add softer storm turbulence, but it should preserve the current signal grammar instead of restoring large generic rings.

## Slice 19 — Procedural combat materials

### Delivered

- Added one shared runtime texture factory for motion trails and storm pulses using small Canvas textures instead of external images or model assets.
- Replaced solid projectile triangles and runner trail planes with a tapered alpha-faded material, removing visible rectangular and polygon boundaries.
- Rebuilt the storm floor read around a soft radial haze, broken circular strokes, and four restrained rune cuts while keeping the existing attack radius and cadence.
- Removed the separate storm-spoke instance path after the pulse texture absorbed that responsibility, reducing duplicated VFX code and one instanced draw layer.
- Reduced the storm core footprint, lifted it above the ground, and added a subtle pulse so it reads as a transient magical focus rather than a static tile.
- Added value-aware XP crystal scaling so stronger drops gain presence without restoring the previous field-wide cyan clutter.

### Verification

- Codex in-app browser review covered balanced combat cadence and the fully populated balanced stress fixture.
- The 360 × 740 mobile stress capture preserves HUD separation and shows the softened storm material without masking the player or nearby enemies.
- Focused Playwright coverage passed combat identity, desktop stress budgets, and mobile stress safe-frame checks.
- No external browser was opened or focused during visual QA.

### Known follow-ups

- Physical iOS and Android review remains necessary for alpha blending, low-brightness visibility, and sustained thermal cost.
- Future VFX additions should extend the shared material factory or use an authored atlas only when they provide a distinct gameplay signal.

## Slice 20 — Release polish and web cleanup

### Delivered

- Added contact-pose displacement to the shared instanced enemy sprite path: actors pull back through the windup, snap forward on a confirmed hit, and recoil subtly when damaged.
- Replaced the last pure-white hit rings, burst cores, shards, and hero accent line with restrained mint, gold, or danger-role highlights.
- Removed three non-gameplay transparent draw layers: two floating atmosphere rings and the oversized middle-field guide ring.
- Rebuilt the terrain micro-surface from multi-scale periodic noise instead of a directional sine grain, with quality-aware repeat density and sparse stone flecks.
- Moved eight enemy-effect classification lists into reusable scratch storage so the visual update loop no longer allocates them every gated frame.
- Reduced the first XP threshold from 30 to 26, centralized the threshold curve, and moved wave-one spawns four meters closer while leaving the late-run growth factors intact.
- Added pure regression contracts for the first four XP thresholds, the first three circuit unlocks inside 180 seconds, and the separation between attack anticipation and impact poses.
- Converted all three RGB character atlases to pixel-identical lossless WebP, reducing their combined deployable size from 6,446,144 bytes to 4,506,600 bytes (about 30%).

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 229.90 kB (68.43 kB gzip).
- `npm run qa:smoke`: 31/31 passed, including desktop input, all quality tiers, zero-GLB delivery, contact motion, opening pacing, all combat families, results, desktop stress, and the 360 × 740 mobile safe frame.
- `git diff --check`: passed.
- Codex in-app browser review confirmed that the oversized middle-field ring is gone and the dense stress composition remains readable without opening an external browser.

### Known follow-ups

- Physical iOS and Android testing remains necessary for touch latency, alpha shimmer, outdoor brightness, safe-area behavior, and sustained thermal load.
- Further art gains should come from authored sprite/VFX source improvements or terrain shading, not from restoring broad decorative rings or a second quality-specific battlefield.
