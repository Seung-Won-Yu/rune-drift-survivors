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

## Slice 21 — Run readability and build telemetry

### Delivered

- Added explicit signals at the 45, 115, 170, and 235 second phase boundaries so objective changes no longer arrive silently.
- Reused the encounter presentation layer for one short phase message, keeping objectives suppressed while the signal owns attention.
- Added a distinct three-note phase cue without changing spawn, damage, XP, circuit, or timing balance.
- Added a compact result damage route that ranks the top three weapon sources by contribution share and DPS.
- Made narrow-screen touch controls depend on usable viewport width as well as coarse-pointer detection, avoiding hidden controls in mobile browser configurations with unreliable media reporting.

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 231.25 kB (68.87 kB gzip).
- `npm run qa:smoke`: 32/32 passed, including phase-boundary, result-contribution, 360 × 740 touch flow, and mobile stress checks.
- Codex in-app browser review confirmed clean phase-signal hierarchy and a restrained desktop result breakdown without opening an external browser.
- The 360 × 740 captured result keeps all three contribution bars legible and the replay action reachable by scrolling.

### Known follow-ups

- The next balance pass should collect real five-minute run samples across at least three build routes before changing weapon or enemy tuning.
- Physical iOS and Android checks remain necessary for touch latency, browser safe areas, outdoor contrast, and sustained thermal behavior.

## Slice 22 — Repeatable balance sampling

### Delivered

- Added a development-only game snapshot that reports run phase, health, progression, build focus, upgrades, circuit navigation, and per-source damage without exposing mutable state.
- Added `npm run qa:balance`, a headless live-loop sampler that runs three guided routes with a fixed seed, follows seals, drafts toward the selected route, and stores screenshots plus JSON evidence outside Git.
- Recorded the first full five-minute baseline: storm-chain reached 1,226.9 DPS and 2,066 KOs, blade-nova reached 756.4 DPS and 1,404 KOs, and orb-pierce reached 1,316.0 DPS and 2,212 KOs; all three sealed 4/4, defeated three bosses, and won.
- Found and fixed two combat-contract defects from the baseline: orbit blades ignored their rendered length and ground-plane footprint, while stationary storm and moving orb projectiles could repeatedly spend pierce on the same enemy across frames.
- Fixed guided replay drafting so an unlocked replay family replaces the forced starter-orb slot during levels 2–7.
- Improved the sampler's melee behavior and card selection so unavailable secondary-family cards no longer cause it to skip an available primary route card.

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 231.80 kB (69.06 kB gzip).
- `npm run qa:smoke`: 36/36 passed, including immutable snapshots, blade footprint, distinct-target pierce, guided replay drafting, mobile flows, results, and stress budgets.
- The initial `npm run qa:balance` baseline completed in 5.2 minutes with all three routes at approximately 60 average FPS.
- Focused 60-second reruns verified that storm-chain damage became 77% route-aligned after repeat-hit removal and that blade replay focus reached blade V with only orb II after the draft fix.
- Codex in-app review confirmed that the corrected combat path preserves the existing clean battlefield and HUD hierarchy without opening an external browser.

### Known follow-ups

- Blade-nova still contributes only about 7% of damage in the 60-second route sample despite correct focus, so it needs at least two more full-run seeds before choosing between active reach, retaliation, or defensive-contribution visibility.
- The current sampler approximates player intent; its fixed seed stabilizes random choices but frame timing can still change exact spawn and hit order.
- Physical iOS and Android verification remains necessary for real touch behavior, thermal load, and browser safe areas.

## Slice 23 — Route identity and traversal combat

### Delivered

- Extended run telemetry with damage buckets for all five run phases plus post-mitigation damage taken and actual healing instead of inferring survivability from final HP.
- Preserved separate JSON artifacts for non-default balance seeds so full-run evidence is not overwritten between samples.
- Unified orbit-blade render and collision positioning around one radius calculation and exposed that live radius to the QA snapshot.
- Reordered the early draft so an available synergy partner is shown before unrelated weapon families; blade routes can now surface solar nova instead of silently filling all three slots first.
- Added a short, bounded blade sweep against nearby targets. The orbit remains the close-defense layer, while the sweep gives the family useful contribution during mandatory circuit travel.
- Kept raw weapon multipliers unchanged; the behavior correction is based on live-loop evidence rather than compensating for missed contact with larger numbers.

### Balance evidence

- Default post-correction seed: storm-chain 1,012.0 DPS / 79% route share, blade-nova 541.9 DPS / 28%, and orb-pierce 719.7 DPS / 24%; all three completed the circuit and won.
- Seed `439041101`: storm-chain 940.5 DPS / 84% route share, blade-nova 677.7 DPS / 30%, and orb-pierce 885.9 DPS / 67%; all three completed the circuit and won.
- Incoming/healing telemetry distinguished the second seed's outcomes: storm took and healed 31 damage, blade took 49 with no healing, and orb took no damage.
- After synergy-slot and blade-sweep changes, the 60-second comparison measured storm-chain at 179.1 DPS, blade-nova at 107.0 DPS, and orb-pierce at 104.7 DPS. Blade-nova was no longer below the comparable orb route, while storm retained its intended early crowd-control lead.
- A focused 60-second blade sample attributed 32% to blade and 25% to nova, for 57% combined route contribution.

### Verification

- `npm run qa:smoke`: 39/39 passed, covering phase telemetry, immutable QA snapshots, shared blade radius, bounded blade sweep, synergy-aware replay drafting, live combat identity, results, and the 360 × 740 mobile stress frame.
- `npm run build`: passed with 691 transformed modules; the main game chunk is 234.25 kB (69.87 kB gzip).
- Codex in-app browser review kept the balanced combat scene stable; the latest background capture shows the gold blade layer without white sprite borders, oversized sweep geometry, or HUD overlap.
- No external browser was opened or focused during the QA pass.

### Known follow-ups

- General enemy pressure remains low in the first three minutes; tune contact pressure separately from weapon identity using the new incoming-damage data.
- Storm keeps a material early AoE advantage. Revisit its strike/radius stacking only after another post-sweep five-minute set, not from the 60-second checkpoint alone.
- Physical-device testing remains required for touch movement, blade-sweep legibility, thermal load, and browser safe areas.

## Slice 24 — Saturation and pursuit balance

### Delivered

- Added per-phase incoming-damage and healing buckets so early ease, mid-run pressure, and final danger can be compared without inferring timing from final HP.
- Bounded the fully upgraded storm at five simultaneous strikes and five distinct targets per field, with a 0.48-second minimum cast interval.
- Bounded chain lightning at ten targets, a 0.38-second minimum interval, and a positive 28% final-target floor. This removes the previous negative falloff at very high chain counts.
- Added a short runner-only pursuit lead that predicts no more than 3.2 meters ahead of the player. Physical distance still controls contact windup and hits, so the change improves approach lines without granting invisible reach.
- Left base damage, enemy contact damage, contact reach, spawn density, circuit timing, and quality-independent simulation budgets unchanged.

### Balance evidence

- The post-blade, pre-saturation reference measured storm-chain at 1,442.7 DPS / 2,305 KOs, blade-nova at 586.6 / 1,247, and orb-pierce at 636.0 / 1,320.
- After saturation and pursuit changes, the five-minute sample measured storm-chain at 728.5 DPS / 1,530 KOs, blade-nova at 695.8 / 1,340, and orb-pierce at 846.1 / 1,456.
- All three routes completed the four-seal circuit and won. Final health was 109/140 for storm, 97/120 for blade, and 105/140 for orb; recorded incoming damage stayed in a narrow 23–35 range.
- At 180 seconds the kill totals were 887 storm, 698 blade, and 682 orb. At 270 seconds they were 1,402, 1,194, and 1,275, showing that the former two-times storm lead now converges through the final phase.
- A 60-second pursuit checkpoint remained avoidable for a continuously moving and dashing bot. The improvement changes interception lines rather than forcing unavoidable early damage.

### Decision

- Stop tuning this pass. The remaining spread is smaller than normal run-to-run drafting and frame-order variance, and further equalization would flatten the intended weapon identities.
- Preserve the new phase telemetry for future enemy-pressure work and require another multi-seed sample before changing raw damage values.

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 235.12 kB (70.14 kB gzip).
- `npm run qa:smoke`: 41/41 passed in 47.8 seconds, including pure saturation/pursuit contracts, live contact timing, desktop combat, all result states, and the 360 × 740 stress frame.
- Codex in-app browser review confirmed the balanced combat scene remained stable. Desktop and mobile captures show no restored white sprite borders, oversized storm radius geometry, or HUD overlap.
- No external browser was opened or focused during verification.

### Known follow-ups

- Guided replay identifies an opening route, not a locked loadout. After a family reaches its rank cap, later cards can still produce a hybrid build and change final source share.
- Physical-device review remains necessary for runner interception readability, touch dodging, thermal load, and safe-area behavior.

## Slice 25 — Result survival record

### Delivered

- Added a compact survival record below the result damage route using the existing incoming-damage and actual-healing telemetry.
- Reported received damage, actual recovered health, and the run phase with the highest incoming damage without adding another large result card.
- Added a no-hit fallback so incomplete or diagnostic runs never invent a dangerous phase.
- Aligned deterministic victory, survived, and defeat fixtures so their phase damage and healing buckets sum to their reported run totals.
- Added the missing shared mint interface token already referenced by completed-circuit styling.

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 236.29 kB (70.47 kB gzip).
- `npm run qa:smoke`: 42/42 passed in 48.3 seconds, including survival-summary logic, victory/survival overlays, mobile touch flow, and the 360 × 740 stress frame.
- Desktop and 360 × 740 result captures keep the survival line visually subordinate, preserve the replay action, and show no horizontal overflow or bright panel outlines.
- QA remained headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for real browser chrome, safe areas, outdoor contrast, and touch latency.
- Future result additions should replace or consolidate existing facts rather than increasing the panel height.

## Slice 26 — Dodgeable opening pressure

### Delivered

- Added a runner-only approach-speed curve that peaks during the 85–145 second pressure window and tapers before the final density spike.
- Preserved player speed, enemy counts, contact reach, contact windup, recovery, and raw damage. Faster approach creates more readable attack attempts without granting invisible hits.
- Moved hit feedback ahead of crisis and dash notices, replaced the duplicate `피격 피격 -N` copy with `-N HP`, and assigned the actual danger-red signal color.
- Added a short, reduced-motion-safe edge vignette and temporarily hid onboarding/objective cards during the 0.62-second hit response.
- Attached the mobile hit row directly below the vitals panel with matching width, keeping the XP meter and touch controls unobstructed.

### Balance evidence

- Before this slice, the latest default five-minute sample recorded zero incoming damage through the first 145 seconds for all three guided routes.
- The final 145-second diagnostic recorded 6 damage for blade-nova and 26 for orb-pierce, with the blade damage fully recovered by the life seal. Storm-chain remained unharmed through its stronger opening clear.
- The complete five-minute sample ended in three victories and 4/4 circuits: storm-chain 829.5 DPS / 32 damage taken, blade-nova 741.0 / 0, and orb-pierce 822.9 / 0.
- The changing hit recipient across deterministic-seed runs confirms frame-order variance rather than a forced damage script. No route suffered chained early hits or lost its ability to complete the circuit.

### Decision

- Keep the new runner curve. It removes the universally empty opening without flattening build identity or increasing raw damage.
- Do not add another early surge or shorten contact telegraphs in this pass.

### Verification

- `npm run build`: passed with 691 transformed modules; the main game chunk is 236.54 kB (70.54 kB gzip).
- `npm run qa:smoke`: 44/44 passed in 49.8 seconds, including runner pressure, damage-notice priority, desktop/mobile post-impact captures, touch flow, and stress budgets.
- `npm run qa:balance`: all three five-minute guided routes won and completed 4/4 circuits.
- The Codex in-app browser loaded the deterministic contact route while remaining in the background; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for real dodge timing, thumb reach, browser safe areas, and vibration expectations.
- If future samples again show universally empty openings, inspect spawn approach geometry before raising damage or enemy caps.

## Slice 27 — Future-safe module boundaries

### Delivered

- Kept the original public runtime imports as compatibility facades while separating QA fixtures, run objectives, scoring, weapon casts, enemy accents, field pickups, shrines, HUD styles, and overlay styles by responsibility.
- Preserved game behavior and CSS cascade order so future feature work can replace one subsystem without reopening the full runtime.
- Added focused contracts around the extracted modules and retained the three-route sampler as the balance boundary.

### Verification

- `npm run build` and the 44-test browser suite passed after the boundary split.
- The three guided five-minute routes still completed their circuits and won after the refactor.

## Slice 28 — Game-first UI/UX unification

### Delivered

- Confirmed that no deployable Blender, GLB, GLTF, FBX, OBJ, or MTL asset and no runtime model loader remains. Documentation and `.glb` request guards are intentionally retained as the model-free contract.
- Reframed pause around the current run phase and dominant build, with secondary stats and controls visually subordinate to the run identity.
- Grouped result damage and survival telemetry into one compact combat record while preserving grade, build highlights, and the next-run recommendation.
- Added named dialog semantics, initial focus, focus return, and contained Tab navigation to pause, upgrade, and result overlays.
- Added a 2.6-second two-step restart guard to both the HUD icon and pause action so an active run cannot be reset by one stray click.
- Removed false button semantics from the pointer-drag joystick, increased critical mobile HUD text, and attached non-boss alert rows to the HUD grid instead of a fragile fixed vertical coordinate.
- Consolidated spacing, type, motion, and panel-shadow tokens and moved the first-run prompt from a rounded web card toward the cut-corner Rune Circuit frame language.

### Verification

- `npm run build`: passed with 716 transformed modules; the main game chunk is 249.96 kB (74.64 kB gzip).
- `npm run qa:smoke`: 46/46 passed in 52.2 seconds, including zero-model startup, dialog focus containment, restart confirmation, touch movement, mobile hit/HUD attachment, upgrades, results, and stress budgets.
- Desktop and 360 × 740 background captures show no new white sprite fringe, heavy overlay outline, horizontal overflow, or hidden primary action.
- QA stayed headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for real safe areas, thumb reach, virtual-keyboard interaction, browser focus behavior, and restart-confirmation feel.
- Future overlay additions should replace or collapse an existing line of information instead of increasing pause or result height.

## Slice 29 — HUD icon and entry coherence

### Delivered

- Replaced mixed Unicode HUD and touch glyphs with one reusable, code-built stroke SVG family for vitals, sound, pause, restart, alerts, and dash.
- Reframed the generic loader as a cut-corner Rune Circuit entry panel with run identity, a four-seal route, real loading progress, and a distinct recovery state.
- Added explicit progressbar values and readable progress text to health, experience, run time, boss health, and loading without changing gameplay rules.
- Added matching pressed feedback and activation paths for pointer, keyboard, and assistive-technology dash input.
- Added a dedicated compact rule and browser guard so the clock, actions, vitals, guidance, joystick, and dash stay inside a 320 × 568 viewport without overlap.

### Verification

- `npm run build`: passed with 717 transformed modules; the main game chunk is 252.77 kB (75.51 kB gzip).
- `npm run qa:smoke`: 47/47 passed in 53.8 seconds, including loading, icon delivery, meter semantics, dash input parity, boss state, and the new 320 × 568 compact frame.
- Desktop, 360 × 740, and 320 × 568 background captures show a consistent icon family, contained controls, and no horizontal overflow or competing HUD regions.
- QA stayed headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for native touch latency, safe-area behavior, screen-reader phrasing, and the loading-to-play transition.
- Future HUD icons should extend `RuneIcon` instead of reintroducing font-dependent symbols.

## Slice 30 — Combat signal hierarchy

### Delivered

- Reworked the live objective dock into a compact rune order with one dominant task, semantic progress, and a clear completed/total count.
- Gave circuit events and boss signals dedicated rune markers so transient events no longer read like generic centered web notices.
- Rebuilt the boss strip around three priorities: identity, vitality, and the active pattern. Vitality now includes an explicit percentage and patterns use authored shockwave, summon, or ward glyphs.
- Suppressed duplicated coach, crisis, threat, boss-pattern, and pickup copy while an encounter already communicates the same state. Immediate damage and dash feedback remain available.
- Made the objective QA route deterministic instead of allowing live enemy contact to intermittently hide the component under test.

### Verification

- `npm run build`: passed with 717 transformed modules; the main game chunk is 255.11 kB (76.05 kB gzip).
- `npm run qa:smoke`: 48/48 passed in 54.2 seconds, including objective semantics, encounter signal structure, boss notice deduplication, and compact boss bounds.
- Desktop, 360 × 740, and 320 × 568 background captures show no competing guidance, duplicate crisis row, horizontal overflow, or overlap between vitals and boss status.
- QA stayed headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for real-world boss-pattern reaction time, cast-marker readability, thumb controls, and safe areas.
- Keep future encounter copy to one action-oriented hint; longer explanation belongs in pause or post-run surfaces.

## Slice 31 — Threat readability and effect boundaries

### Delivered

- Added stable-priority timed pools so danger and impact signals survive visual-budget trimming before optional attack, reward, and objective effects.
- Changed threat-warning presentation from early fading to impact-led urgency: the ring warms into danger red while its label, cue, and pulse strengthen toward the hit window.
- Reworked contact windup into a full reach ring plus a closing countdown ring, with the same normalized progress exposed to deterministic QA.
- Extended the threat-reference scene with a charger beam, charge target, and near-impact boss shockwave while suppressing unrelated HUD copy.
- Reduced `WeaponEffects.jsx` and `CombatFeedback.jsx` to stable two-line facades. Their implementations now live under `world/weapon-effects/` and `world/combat-feedback/`, separating persistent auras, strike effects, hit feedback, and danger telegraphs.

### Verification

- `npm run build`: passed with 721 transformed modules; the main game chunk is 256.45 kB (76.51 kB gzip).
- Focused combat regression: 8/8 passed, covering danger-pool priority, late-warning intensity, threat-reference rendering, contact windup/pose/ring behavior, five-weapon identity, and stress budgets.
- `npm run qa:smoke`: 52/52 passed in 59.3 seconds, including every quality tier, desktop/mobile HUD, overlays, contact combat, threat rendering, results, and stress frames.
- Background captures show the contact rings on flat ground and the late boss/charger telegraphs above optional effects without duplicated HUD notices.
- QA stayed headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for real touch reaction timing, outdoor contrast, thermal load, and browser safe areas.
- Future weapon or warning visuals should enter the scoped implementation modules while their facade import paths remain stable.

## Slice 32 — Web surface coherence

### Audit finding

- The interface already handled state feedback, domain language, restart protection, keyboard shortcuts, loading recovery, semantic progress, focus containment, and 320px responsive safety well.
- The main remaining inconsistency was visual: rounded web panels competed with cut-corner rune elements, multiple cards could look simultaneously recommended, and Unicode marks broke the authored icon language.

### Delivered

- Added shared cut-size, frame-polygon, raised/deep surface, and frame-shadow tokens, then applied them across HUD vitals/actions and every overlay surface.
- Added one restrained circuit field behind modal screens and removed floating-card styling from the quality selector so the hierarchy reads as one game surface rather than nested dashboards.
- Extended `RuneIcon` with forward and five build-family marks, then replaced loading, pause, outcome, replay, recommendation, and card-action Unicode symbols.
- Changed upgrade presentation so each draft has one featured recommendation with a filled action, while secondary relevant cards remain calm comparison choices.
- Added inset focus treatment to clipped action buttons, quality choices, HUD controls, and upgrade cards so the new frame geometry does not hide keyboard state.
- Reduced `GameOverlays.jsx` from 326 lines to a three-line facade. `PauseOverlay`, `UpgradeOverlay`, and `EndOverlay` now own their screen-specific structure independently.

### Verification

- `npm run build`: passed with 724 transformed modules; the main game chunk is 257.79 kB (76.96 kB gzip) and CSS is 52.84 kB (10.54 kB gzip).
- Focused Playwright overlay checks passed for loading, HUD, pause objectives, keyboard focus/restart, desktop/mobile upgrade cards, results, boss HUD, and the compact 320px frame.
- Native headless Playwright verification confirmed one featured card, computed polygon clipping, no horizontal overflow at 1440 × 900 and 360 × 740, a 48px mobile replay target, and no browser errors.
- `npm run qa:smoke`: 52/52 passed in 55.4 seconds.
- Desktop and mobile captures show one consistent angular frame language, a single dominant upgrade action, and no restored white fringe, panel collision, or viewport overflow.
- All browser work stayed headless/background-only; no external browser was opened or focused.

### Known follow-ups

- Physical iOS and Android review remains required for font rendering, real touch focus, safe-area chrome, outdoor contrast, and thermal behavior.
- New overlays should live under `src/ui/overlays/` and reuse the frame/icon tokens instead of adding another panel vocabulary.
