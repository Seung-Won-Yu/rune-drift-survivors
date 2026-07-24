# Combat feel pass 01

Status: implemented and verified  
Date: 2026-07-24

## Goal

Make movement and combat feedback feel more deliberate without changing weapon balance, enemy health, run duration, or progression rules.

## Implemented

### Player runtime cleanup

- Separated input and movement physics into `playerMovementRuntime.js`.
- Separated mesh pose and locomotion animation into `playerPresentationRuntime.js`.
- Kept damage handling and feedback orchestration in `playerRuntime.js`.
- Added runtime metrics for active and buffered dash state.

### Movement and dash

- Replaced frame-dependent velocity lerp with time-based acceleration and deceleration.
- Added a 140 ms dash input buffer.
- Kept the existing dash speed, duration, cooldown, and upgrade multiplier.
- Added a browser QA case that presses dash immediately before cooldown completion.

### Combat feedback

- Added one presentation profile table for hit-burst variants.
- Normal defeats now use a compact cyan shatter.
- Elite defeats use a larger multi-shard burst.
- Boss defeats use a long double-ring burst and stronger camera response.
- Player damage and dash effects now use distinct ring geometry.

## Verification

- Production build: pass.
- System Chrome: 9/9 smoke checks pass.
- CI bundled Chromium: 9/9 smoke checks pass.
- Local stress run: at least 55 FPS, zero severe frames in the final pass.
- Keyboard movement, buffered dash, touch movement, touch dash, pause, and resume: pass.

## Next combat pass

1. Add an audio event boundary and a small procedural/audio-placeholder set for cast, hit, defeat, damage, dash, level-up, and boss warning.
2. Give runner, brute, elite, and boss attacks unique anticipation timing and silhouette cues.
3. Capture first-30-second and first-60-second telemetry for time-to-first-kill, first damage, first level-up, and enemy pressure.
4. Tune only after those timings are visible; avoid changing spawn, damage, and movement together.
