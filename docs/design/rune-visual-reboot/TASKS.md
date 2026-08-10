# Rune visual reboot — implementation tasks

## Slice 1 — Foundation

- [x] Delete the five legacy CSS files.
- [x] Add tokens, shell, HUD, overlay, and responsive styles with one owner per selector.
- [x] Update `styles.css` imports.
- [x] Rebuild and run smoke QA.

## Slice 2 — Gameplay HUD

- [x] Rebuild HUD and widget markup around rune-field hierarchy.
- [x] Preserve existing props and game state contracts.
- [x] Verify desktop movement/dash and mobile touch/pause.

## Slice 3 — Upgrade and overlays

- [x] Replace collectible-card markup with rune-tablet choices.
- [x] Rebuild loading, pause, and result presentation.
- [x] Verify upgrade, boss, victory, and failure states.

## Slice 4 — World palette

- [x] Replace the muddy olive shell/background/fog palette.
- [x] Align shared art tokens with rune cyan, ember amber, and danger coral.
- [x] Preserve models, geometry, and runtime budgets.

## Slice 5 — Final audit

- [x] Build and run all smoke tests in system Chrome and CI Chromium.
- [x] Review 360 × 740, 390 × 844, 430 × 932, 740 × 360, and 1440 × 900 screenshots.
- [x] Record remaining issues in `REVIEW.md`.
