export const RIFTBORN_COMMON_ATLAS = Object.freeze({
  columns: 4,
  rows: 6,
  directions: Object.freeze({ back: 0, right: 1, front: 2, left: 3 }),
  roleRows: Object.freeze({ runner: 0, golem: 2, brute: 4 })
});

export const RIFTBORN_THREAT_ATLAS = Object.freeze({
  columns: 4,
  rows: 8,
  frameWidth: 1 / 4,
  frameHeight: 1 / 8,
  directionColumns: Object.freeze({ back: 0, right: 1, front: 2, left: 3 }),
  roleRows: Object.freeze({ bulwark: 0, charger: 2, summoner: 4, boss: 6 })
});

export function getRiftbornDirection(facingAngle = 0) {
  const x = Math.sin(facingAngle);
  const z = Math.cos(facingAngle);
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? 'right' : 'left';
  return z < 0 ? 'back' : 'front';
}

export function getRiftbornAnimationFrame({
  kind = 'golem',
  facingAngle = 0,
  animationPhase = 0,
  motionIntent = 0
} = {}) {
  const role = RIFTBORN_COMMON_ATLAS.roleRows[kind] === undefined ? 'golem' : kind;
  const direction = getRiftbornDirection(facingAngle);
  const column = RIFTBORN_COMMON_ATLAS.directions[direction];
  const movingFrame = motionIntent > 0.12 ? Math.abs(Math.floor(animationPhase * 1.3)) % 2 : 0;
  const row = RIFTBORN_COMMON_ATLAS.roleRows[role] + movingFrame;

  return {
    role,
    direction,
    column,
    row,
    offsetX: column / RIFTBORN_COMMON_ATLAS.columns,
    offsetY: (RIFTBORN_COMMON_ATLAS.rows - row - 1) / RIFTBORN_COMMON_ATLAS.rows
  };
}

export function getRiftbornThreatAnimationFrame({
  kind = 'elite',
  role = 'charger',
  facingAngle = 0,
  animationPhase = 0,
  motionIntent = 0.55
} = {}) {
  const threatRole = kind === 'boss'
    ? 'boss'
    : Object.hasOwn(RIFTBORN_THREAT_ATLAS.roleRows, role)
      ? role
      : 'charger';
  const direction = getRiftbornDirection(facingAngle);
  const column = RIFTBORN_THREAT_ATLAS.directionColumns[direction];
  const moving = motionIntent > 0.16;
  const contact = moving ? Math.abs(Math.floor(animationPhase * 1.05)) % 2 : 0;
  const row = RIFTBORN_THREAT_ATLAS.roleRows[threatRole] + contact;

  return {
    role: threatRole,
    direction,
    column,
    row,
    offsetX: column * RIFTBORN_THREAT_ATLAS.frameWidth,
    offsetY: 1 - (row + 1) * RIFTBORN_THREAT_ATLAS.frameHeight
  };
}
