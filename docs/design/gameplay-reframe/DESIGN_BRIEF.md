# Gameplay Reframe — Rune Circuit

## Why this pass exists

The first visual reboot made the interface and world feel like one product, but the run still lacks a clear reason to move. The optimal behavior is often to circle near the center, collect nearby drops, and wait for upgrades. At the same time, the distant shrines read as optional decoration rather than the spine of the run.

This pass turns the existing four shrines into a paced **Rune Circuit**. The circuit gives every minute a destination, makes traversal part of survival, and lets the world communicate the next decision without adding another large menu.

## Player promise

> Keep moving, ignite the next seal, and finish the circuit before the rift closes.

The player should understand three things at a glance:

1. which seal is next;
2. whether it is ready to channel;
3. what reward advancing the circuit will grant.

## Core loop

1. Survive and collect XP while moving toward the active seal.
2. Hold the seal radius long enough to channel it.
3. Receive a build or survival reward and reveal the next destination.
4. Adapt the route as enemy pressure and boss patterns increase.
5. Complete all four seals, then survive the final rift pressure.

## Circuit beats

| Beat | Target time | Seal | Reward | Intended decision |
| --- | ---: | --- | --- | --- |
| 1 | 18s | Armory | build cache | Choose the first build direction |
| 2 | 78s | Vital | full heal | Take route risk before pressure spikes |
| 3 | 145s | Purge | local enemy clear | Convert a dense wave into breathing room |
| 4 | 215s | Etching | extra upgrade choice | Finish the build before the final surge |

## Visual and UI rules

- Only the next seal owns the tall beam and strong pulse.
- Future seals remain visible but dormant; completed seals leave a quiet ring.
- The run clock carries a compact circuit status, next seal, direction, and distance.
- First-run coaching becomes a short early aid, not a persistent card covering combat.
- The camera frames enemies and pickups large enough to read their silhouettes and telegraphs.
- The field keeps the dark rune mood, but playable surfaces and units must separate from the background.

## Scope of this slice

- Sequential, time-paced shrine activation.
- Circuit state derived from existing `activatedShrines` data.
- World-state distinction for active, dormant, locked, and completed seals.
- Compact circuit HUD and circuit-led phase objectives.
- Tighter camera and brighter combat lighting.
- Deterministic browser smoke coverage for the new HUD state.

## Not in this slice

- New weapons, enemies, or meta-progression.
- A new victory condition; five-minute survival remains valid.
- Final upgrade-card redesign.
- Full combat balance retuning.

## Success criteria

- A new player can name the next destination without opening a menu.
- The first seal cannot be completed before its scheduled beat, and seals cannot be completed out of order.
- Desktop and mobile HUDs expose circuit progress without hiding the player.
- The player, nearby enemies, XP, and the active seal remain readable in the standard balanced-quality view.
- Existing movement, dash, upgrade, boss, result, and performance smoke flows continue to pass.
