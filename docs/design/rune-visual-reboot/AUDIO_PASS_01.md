# Rune visual reboot — audio pass 01

Status: implemented and verified
Date: 2026-08-07

## Goal

Add immediate combat readability and feedback without coupling gameplay systems to audio assets or violating browser autoplay rules.

## Architecture

- `audioCues.js` owns the small, valid cue vocabulary and subscriber boundary.
- Gameplay systems emit semantic cues such as `dash`, `weapon-cast`, or `boss-warning`; they do not create audio nodes.
- `gameAudioEngine.js` owns Web Audio synthesis, per-cue throttling, gain envelopes, and cue variants.
- `useGameAudio.js` owns browser unlock, mute persistence, lifecycle cleanup, and development QA state.
- Unsupported browsers remain silent without changing gameplay behavior.

## Connected cues

- Weapon cast: orb, storm, lightning, and nova pitch variants
- Player dash and damage
- Enemy contact-attack windup
- Normal, elite, and boss defeat
- Elite and boss arrival warning
- Level-up and upgrade selection

## Player control

- The HUD sound button toggles mute without opening another panel.
- Mute state persists through reloads using local storage.
- The audio context is created/resumed only after a key or pointer interaction.

## Verification

- Production build: pass.
- System Chrome: 11/11 smoke checks pass in the current suite.
- CI bundled Chromium: 11/11 smoke checks pass in the current suite.
- Audio QA confirms unlock, a played cue, mute state, and reload persistence.
- Mobile HUD remains contained with three action buttons.
- Stress budget and local real-time FPS checks remain green.

## Next audio pass

1. Replace or layer the procedural placeholders with authored licensed assets while keeping the cue contract unchanged.
2. Add separate SFX and music volume controls only when background music exists.
3. Add stage-based ambient music and boss phase transitions.
4. Verify loudness and latency on physical iOS and Android devices.
