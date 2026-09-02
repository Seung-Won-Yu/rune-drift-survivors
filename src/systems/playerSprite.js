export const RUNE_WARDEN_ATLAS = Object.freeze({
  columns: 4,
  rows: 6,
  directions: Object.freeze({ back: 0, right: 1, front: 2, left: 3 }),
  animationRows: Object.freeze({
    idleA: 0,
    idleB: 1,
    walkA: 2,
    walkB: 3,
    cast: 4,
    hurt: 5
  })
});

export function getRuneWardenDirection(facing = { x: 0, z: 1 }) {
  if (Math.abs(facing.x) > Math.abs(facing.z)) return facing.x > 0 ? 'right' : 'left';
  return facing.z < 0 ? 'back' : 'front';
}

export function getRuneWardenAnimationFrame({
  facing = { x: 0, z: 1 },
  timeMs = 0,
  speed = 0,
  dashTimer = 0,
  castPulse = 0,
  hurtPulse = 0
} = {}) {
  const direction = getRuneWardenDirection(facing);
  const column = RUNE_WARDEN_ATLAS.directions[direction];
  let state = 'idle';
  let row;

  if (hurtPulse > 0.025) {
    state = 'hurt';
    row = RUNE_WARDEN_ATLAS.animationRows.hurt;
  } else if (castPulse > 0.02) {
    state = 'cast';
    row = RUNE_WARDEN_ATLAS.animationRows.cast;
  } else if (speed > 0.3 || dashTimer > 0) {
    state = 'walk';
    const frameDuration = dashTimer > 0 ? 80 : 135;
    row = Math.floor(timeMs / frameDuration) % 2
      ? RUNE_WARDEN_ATLAS.animationRows.walkB
      : RUNE_WARDEN_ATLAS.animationRows.walkA;
  } else {
    row = Math.floor(timeMs / 520) % 2
      ? RUNE_WARDEN_ATLAS.animationRows.idleB
      : RUNE_WARDEN_ATLAS.animationRows.idleA;
  }

  return {
    state,
    direction,
    column,
    row,
    offsetX: column / RUNE_WARDEN_ATLAS.columns,
    offsetY: (RUNE_WARDEN_ATLAS.rows - row - 1) / RUNE_WARDEN_ATLAS.rows
  };
}
