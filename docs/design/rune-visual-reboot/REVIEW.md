# Rune visual reboot — final review

Status: ready for user review
Date: 2026-08-07
Branch: `codex/rune-visual-reboot`

## Outcome

The previous casual-board/card visual language was replaced with one dark rune-field system. Combat rules, game-state contracts, models, and runtime budgets remain intact.

## Structure

- Legacy `base.css`, `casual-ui.css`, `hud-core.css`, `overlays-core.css`, and `responsive-core.css` removed.
- New ownership split: tokens, shell, HUD, overlays, and media-query-only responsive rules.
- Cross-file duplicate base selector owners: 0.
- UI markup now exposes rune-field components while retaining only the selector aliases needed by smoke QA.

## Player experience

- Health, XP, remaining time, kills, pause, and restart remain immediately visible.
- First-run guidance is a single left-side directive rather than a stack of casual cards.
- Touch controls stay in the lower safe area and remain usable in portrait and landscape.
- Upgrade choices show role, name, primary effect, and one action in a consistent rune-tablet hierarchy.
- Loading, pause, upgrade, boss, and result states now share the same surface, line, color, and type language.
- The battlefield palette now uses cold teal forest/stone values; amber is reserved for reward and landmark emphasis.
- Contact pressure is now readable as approach, windup, hit, and recovery rather than instant overlap damage.

## Verification

- Production build: pass.
- System Chrome smoke QA: 11/11 pass.
- CI bundled Chromium smoke QA: 11/11 pass.
- Keyboard movement and dash: pass.
- Mobile touch movement, dash, pause, and resume: pass.
- Loading, upgrade, boss, result, and stress states: pass.
- Runtime pool caps and local 55 FPS smoke threshold: pass.
- Buffered dash input just before cooldown completion: pass.
- Audio unlock, cue playback, mute, and reload persistence: pass.
- Deterministic enemy contact windup, hit, and recovery: pass.

Supported viewport inspection:

| Viewport | Result |
| --- | --- |
| 360 × 740 | Critical HUD and touch controls contained |
| 390 × 844 | Critical HUD contained; all three upgrade choices fit without modal scroll |
| 430 × 932 | Critical HUD and touch controls contained |
| 740 × 360 | Landscape HUD, coach, and touch controls contained |
| 1440 × 900 | Desktop HUD and first-run directive contained |

No page or console errors were recorded during the viewport pass.

## Remaining follow-up

- Visual review on physical iOS and Android devices is still recommended before a public release because browser chrome, haptics, and real touch latency are outside headless QA.
- The visual reboot, audio pass, and enemy-telegraph pass were committed and pushed to `origin/codex/rune-visual-reboot`.
