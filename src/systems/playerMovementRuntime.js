import {
  ARENA_RADIUS,
  DASH_ACCELERATION,
  DASH_COOLDOWN,
  DASH_INPUT_BUFFER,
  DASH_INVULNERABILITY,
  DASH_SPEED,
  DASH_TIME,
  PLAYER_ACCELERATION,
  PLAYER_DECELERATION,
  PLAYER_RADIUS,
  PLAYER_SPEED
} from '../config/gameTuning.js';
import {
  getPlayerTerrainY,
  resolveStaticCollisions
} from './terrain.js';

export function samplePlayerControls({
  keys,
  dashQueued,
  touchControlsRef,
  player,
  input
}) {
  const touchInput = touchControlsRef?.current;
  if (touchInput?.dashQueued) {
    dashQueued.current = true;
    touchInput.dashQueued = false;
  }
  if (dashQueued.current) {
    player.current.dashBuffer = DASH_INPUT_BUFFER;
  }
  dashQueued.current = false;

  input.set(
    Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) - Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')),
    0,
    Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) - Number(keys.current.has('KeyW') || keys.current.has('ArrowUp'))
  );
  if (touchInput?.active) {
    input.x += touchInput.x;
    input.z += touchInput.z;
  }
  const hasInput = input.lengthSq() > 0;
  if (hasInput) input.normalize();
  return hasInput;
}

export function advancePlayerMovement({
  dt,
  stats,
  player,
  scratch,
  input,
  hasInput
}) {
  const runtime = player.current;
  runtime.dashCd = Math.max(0, runtime.dashCd - dt);
  runtime.dashBuffer = Math.max(0, (runtime.dashBuffer ?? 0) - dt);

  const startedDash = runtime.dashBuffer > 0 && runtime.dashCd <= 0;
  if (startedDash) {
    const dashDirection = hasInput
      ? scratch.dashDirection.copy(input)
      : scratch.dashDirection.copy(runtime.facing);
    if (dashDirection.lengthSq() > 0.001) {
      runtime.facing.copy(dashDirection.normalize());
    }
    runtime.dashTimer = DASH_TIME;
    runtime.dashCd = DASH_COOLDOWN * stats.dashCooldown;
    runtime.dashBuffer = 0;
    runtime.invuln = Math.max(runtime.invuln, DASH_INVULNERABILITY);
    runtime.vel.copy(runtime.facing).multiplyScalar(DASH_SPEED * 1.08);
  }

  if (hasInput && runtime.dashTimer <= 0) runtime.facing.copy(input);
  const isDashing = runtime.dashTimer > 0;
  const moveDirection = isDashing
    ? scratch.moveDirection.copy(runtime.facing)
    : scratch.moveDirection.copy(input);
  const speed = isDashing ? DASH_SPEED : PLAYER_SPEED * stats.speed;
  const response = isDashing
    ? DASH_ACCELERATION
    : hasInput
      ? PLAYER_ACCELERATION
      : PLAYER_DECELERATION;
  const blend = 1 - Math.exp(-dt * response);

  runtime.dashTimer = Math.max(0, runtime.dashTimer - dt);
  runtime.vel.lerp(scratch.velocityTarget.copy(moveDirection).multiplyScalar(speed), blend);
  runtime.pos.addScaledVector(runtime.vel, dt);
  resolveStaticCollisions(runtime.pos, PLAYER_RADIUS);

  const flat = scratch.flat.set(runtime.pos.x, runtime.pos.z);
  if (flat.length() > ARENA_RADIUS - 0.8) {
    flat.setLength(ARENA_RADIUS - 0.8);
    runtime.pos.x = flat.x;
    runtime.pos.z = flat.y;
  }
  const groundY = getPlayerTerrainY(runtime.pos.x, runtime.pos.z);
  runtime.pos.y += (groundY - runtime.pos.y) * Math.min(1, dt * 10);

  return startedDash;
}
