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
