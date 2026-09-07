# First-seal experience pass

## Purpose

Make the opening route readable: learn movement and automatic attacks, collect XP, choose a useful rune, and reach the first seal. This pass improves presentation and guidance while retaining the existing enemy, reward, upgrade, and circuit rules.

## Changes

- Landscape framing moves from the balanced camera's 36/60 height/depth to 32/53. Portrait keeps 34/56. Every quality tier uses the same field of view and orientation-based framing; follow smoothing respects frame delta.
- The Warden has one consistent 4.65 sprite size across quality tiers. A restrained midtone lift distinguishes the player and enemies from the floor without changing keyed alpha edges or adding draw calls.
- Movement instructions remain until movement is demonstrated. XP collection and dash use never block guidance to an available first seal. Guidance ends after the first seal or the opening minute.
- Keyboard and touch instructions cover both phone and coarse-pointer tablet layouts. The coach sits beneath the HUD and yields to immediate danger, dash feedback, and replay-route confirmation. Routine pickup copy is suppressed only while the coach is visible.
- Early, pre-seal cards show a concrete effect, the relevant change, and one route-specific reason. Orb target previews include focus bonuses through the same count function used by the weapon runtime. Later cards retain rank and synergy details.
- Non-numeric keys no longer enter the numeric upgrade shortcut path. Tab, Shift+Tab, Enter, and native button behavior remain available alongside shortcuts 1–3.

## Verification coverage

- Guidance transition with zero dash uses and zero XP when the seal opens; movement instructions persist for an idle player.
- Upgrade comparisons preserve the current game and include the extra target granted at the next focus threshold.
- Camera projection keeps the player and nearby threats visible at the start, halfway to the first seal, and at the seal in landscape and portrait.
- Real card selection through keyboard navigation and Enter updates the chosen weapon family.
- Guidance, vitals, navigation, alerts, joystick, and dash do not overlap at 320×568, 360×740, 768×1024, 1024×768, and 740×360. Every card's reason and selection action remain accessible, with vertical scrolling when needed.
- Existing combat, quality, focus, replay, boss, result, and stress checks remain the regression boundary.

Visual artifacts are generated under `output/playwright/qa-first-seal-*.png` and `output/playwright/qa-opening-draft-*.png`. These are local QA output, not shipped assets.

Final verification on 2026-09-07: `npm run build` passed; `npm run qa:smoke` passed all 61 checks in 1.2 minutes, including the local real-time stress threshold. The independent review's movement, tablet-input, and replay-notice findings were resolved. Codex in-app review and generated phone/landscape captures confirmed readable sprite edges and unobstructed controls.

## Next player check

Observe five first-time players without coaching. Record whether they find the first seal, can explain their chosen upgrade, and can identify what hit them. Physical iOS/Android touch timing, outdoor contrast, and browser safe areas still need device testing. Automated runs do not establish that the game is more enjoyable.
