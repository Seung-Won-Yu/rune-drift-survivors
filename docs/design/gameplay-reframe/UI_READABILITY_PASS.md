# Visible UI/UX readability pass

Make the next destination and the next upgrade understandable at a glance. Keep the existing dark green, warm parchment, gold seals, cyan runes, and angular frames. Use the authored rune atlas rather than adding new art payloads.

## Hierarchy and layout

- Gameplay: health and XP stay together; the timer is paired with the next seal. On phones, vitals and 44px action buttons occupy the first row and navigation spans the second. Distance and opening time remain visible at 320px.
- Four seal markers use numbers, a current-step border, and completed check marks. Their accessible labels identify the seal and its state. The direction arrow and target name are visually separate from progress.
- Health has a thicker 6px gauge. Quiet text uses `#91a79b` instead of `#71867c`. This is a targeted readability pass, not a full accessibility certification.
- Existing coach, optional detour, encounter, and boss priorities remain in force. Brief damage feedback occupies the XP row inside the vitals panel, preserving the health gauge and navigation position. Low-health feedback says “즉시 회피” without repeating the health value above it. HUD elements preserve the player's central space and the lower touch controls.
- Compact landscape layouts at 568px and 667px retain the timer, destination, and 44px actions even with simulated 44px left and right safe-area insets. The destination arrow has an accessible direction label.
- Upgrade cards emphasize one illustration, one title, a plain-language effect, a numeric change, and a full-width selection action. Recommendation is written explicitly and accompanied by an icon. Repeated role/tag/decision labels are removed from the card body.
- The upgrade header names the action and states that combat is paused. XP-growth copy describes XP growth rather than implying better random choices.

## Presentation sizes and states

| Element | Desktop | Phone / compact layout |
| --- | --- | --- |
| Rune illustration | 136px; 112px at tablet widths | 52px; 50px in short landscape |
| Card title | 20–24px | 17px |
| Effect summary | 13–14px | 12px minimum |
| Numeric effect | 16px | 16px |
| First-choice reason | 13px | 12px minimum |
| Seal destination | 15px | 15px |
| Seal distance/status | 11px | 11px; never hidden |
| HUD action buttons | 44px | 44–46px |

Cards remain native buttons, with visible focus, an immediate pressed state, Tab/Shift+Tab containment, Enter/Space activation, and 1–3 shortcuts. Coarse-pointer devices hide keyboard hints. Reduced-motion preferences retain the existing animation override. All choices remain reachable by vertical scrolling; readability is not traded for fitting every card into one small screen.

## Verification artifacts

Existing smoke checks cover first-session guidance, touch controls, reward selection, pause/restart, bosses, results, and performance. The updated viewport checks also require readable destination details, visible card explanations, an unclipped opening heading, and 44px compact HUD buttons. The new seal-track check exercises the first, second, fourth, and completed states.

Validation on 2026-09-07: the complete 73-case smoke suite passed. After shortening the low-health feedback, a focused four-case run passed: the existing mobile move/dash/pause flow and three new low-health checks at 320×568, 568×320, and 1440×900. These checks exercise actual enemy contact and assert that feedback stays below the health gauge and inside the vitals panel. The suite now contains 76 cases; all 76 were not rerun together. The final production build and `git diff --check` also passed. The low-health phone capture and all three comparison-page views were visually inspected.

Before captures are retained locally under `output/playwright/ui-before/`. Updated captures use the normal `qa-smoke-hud`, `qa-smoke-compact-mobile`, `qa-smoke-upgrade`, and `qa-opening-draft-*` names. The local comparison page is `output/ui-design-comparison.html`.

No combat, balance, camera, or reward-selection rules changed in this pass. Physical-phone touch and a first-time-player comparison remain outside the automated evidence.
