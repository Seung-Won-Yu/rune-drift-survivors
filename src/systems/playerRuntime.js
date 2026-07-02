import * as THREE from 'three';
import { ART_TOKENS } from '../config/gameData.js';
import {
  ARENA_RADIUS,
  DASH_COOLDOWN,
  DASH_SPEED,
  DASH_TIME,
  PLAYER_RADIUS,
  PLAYER_SPEED
} from '../config/gameTuning.js';
import { getBuildFocus } from './progression.js';
import {
  getPlayerTerrainY,
  resolveStaticCollisions
} from './terrain.js';

export function damagePlayerRuntime({
  amount,
  game,
  updateGame,
  invuln = 0.62,
  player,
  hitBursts,
  cameraShake,
  addDamageNumber
}) {
  if (player.current.invuln > 0) return false;
  const bladeFocus = getBuildFocus(game, 'blade');
  const guardedAmount = bladeFocus >= 2
    ? amount * (1 - Math.min(0.28, bladeFocus * 0.055))
    : amount;
  player.current.invuln = invuln;
  player.current.hurtPulse = Math.max(player.current.hurtPulse ?? 0, 0.62);
  cameraShake.current = Math.max(cameraShake.current, 0.28);
  const damageValue = Math.ceil(guardedAmount);
  hitBursts.current.push({
    pos: player.current.pos.clone(),
    life: 0.42,
    maxLife: 0.42,
    color: ART_TOKENS.dangerRed,
    type: 'playerHit',
    stage: 4,
    radius: 3.2
  });
  addDamageNumber(player.current.pos, `-${damageValue}`, ART_TOKENS.dangerRed, 0.82);
  updateGame(current => {
    const nextHp = Math.max(0, current.stats.hp - guardedAmount);
    const hpRatio = nextHp / current.stats.maxHp;
    return {
      ...current,
      phase: nextHp <= 0 ? 'ended' : current.phase,
      result: nextHp <= 0 ? 'defeat' : current.result,
      damageFlash: 0.62,
      damageMessage: hpRatio <= 0.34 ? '위험: 체력 낮음' : `피격 -${damageValue}`,
      stats: { ...current.stats, hp: nextHp }
    };
  });
  return true;
}

export function updatePlayerRuntime({
  dt,
  stats,
  updateGame,
  player,
  playerMesh,
  keys,
  dashQueued,
  touchControlsRef,
  scratch,
  hitBursts,
  weaponEffects,
  cameraShake,
  addDamageNumber
}) {
  const touchInput = touchControlsRef?.current;
  if (touchInput?.dashQueued) {
    dashQueued.current = true;
    touchInput.dashQueued = false;
  }
  const input = scratch.input.set(
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

  player.current.dashCd = Math.max(0, player.current.dashCd - dt);
  player.current.invuln = Math.max(0, player.current.invuln - dt);
  player.current.castPulse = Math.max(0, (player.current.castPulse ?? 0) - dt * 3.6);
  player.current.hurtPulse = Math.max(0, (player.current.hurtPulse ?? 0) - dt * 2.8);

  if (dashQueued.current && player.current.dashCd <= 0) {
    const dashDir = hasInput
      ? scratch.dashDirection.copy(input)
      : scratch.dashDirection.copy(player.current.facing);
    if (dashDir.lengthSq() > 0.001) {
      player.current.facing.copy(dashDir.normalize());
    }
    player.current.dashTimer = DASH_TIME;
    player.current.dashCd = DASH_COOLDOWN * stats.dashCooldown;
    player.current.invuln = Math.max(player.current.invuln, 0.46);
    player.current.vel.copy(player.current.facing).multiplyScalar(DASH_SPEED * 1.08);
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.34,
      maxLife: 0.34,
      color: '#70d6ff',
      type: 'dash',
      stage: 4,
      radius: 3.2
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: player.current.pos.clone(),
      life: 0.34,
      maxLife: 0.34,
      color: '#70d6ff',
      radius: 7.2
    });
    addDamageNumber(player.current.pos, '회피', '#9ff7ff', 0.74);
    cameraShake.current = Math.max(cameraShake.current, 0.18);
    updateGame(current => ({ ...current, dashUses: (current.dashUses ?? 0) + 1 }));
  }
  dashQueued.current = false;

  if (hasInput && player.current.dashTimer <= 0) player.current.facing.copy(input);
  const isDashing = player.current.dashTimer > 0;
  const moveDirection = isDashing
    ? scratch.moveDirection.copy(player.current.facing)
    : scratch.moveDirection.copy(input);
  const speed = isDashing ? DASH_SPEED : PLAYER_SPEED * stats.speed;
  player.current.dashTimer = Math.max(0, player.current.dashTimer - dt);
  player.current.vel.lerp(scratch.velocityTarget.copy(moveDirection).multiplyScalar(speed), isDashing ? 0.78 : 0.32);
  player.current.pos.addScaledVector(player.current.vel, dt);
  resolveStaticCollisions(player.current.pos, PLAYER_RADIUS);

  const flat = scratch.flat.set(player.current.pos.x, player.current.pos.z);
  if (flat.length() > ARENA_RADIUS - 0.8) {
    flat.setLength(ARENA_RADIUS - 0.8);
    player.current.pos.x = flat.x;
    player.current.pos.z = flat.y;
  }
  const groundY = getPlayerTerrainY(player.current.pos.x, player.current.pos.z);
  player.current.pos.y += (groundY - player.current.pos.y) * Math.min(1, dt * 10);

  if (playerMesh.current) {
    playerMesh.current.position.copy(player.current.pos);
    const yaw = Math.atan2(player.current.facing.x, player.current.facing.z);
    const moveSpeed = player.current.vel.length();
    const moveAmount = THREE.MathUtils.clamp(moveSpeed / (PLAYER_SPEED * 1.2), 0, 1);
    const stride = performance.now() * 0.012;
    const step = Math.sin(stride);
    const stepLift = Math.max(0, step) * moveAmount;
    const dashPower = player.current.dashTimer > 0 ? 1 : 0;
    const castPulse = player.current.castPulse ?? 0;
    const hurtPulse = player.current.hurtPulse ?? 0;
    const bob = (Math.abs(step) * 0.09 + stepLift * 0.04) * moveAmount + dashPower * 0.04;
    const sideSway = Math.sin(stride * 0.5) * 0.072 * moveAmount;
    const tilt = Math.min(0.32, moveSpeed * 0.022) + castPulse * 0.04;
    const dashScale = 1 + dashPower * 0.16;
    playerMesh.current.position.y += bob + castPulse * 0.04 + hurtPulse * 0.03;
    playerMesh.current.rotation.set(
      -player.current.facing.z * tilt + step * 0.065 * moveAmount - dashPower * 0.12 - hurtPulse * 0.16,
      yaw + sideSway + hurtPulse * Math.sin(stride * 0.8) * 0.12,
      player.current.facing.x * tilt + Math.sin(stride * 0.5) * 0.055 * moveAmount + castPulse * 0.12
    );
    playerMesh.current.scale.set(
      dashScale * (1 + stepLift * 0.045 + castPulse * 0.08 + hurtPulse * 0.05),
      dashScale * (1 - stepLift * 0.07 + dashPower * 0.02 - hurtPulse * 0.08),
      dashScale * (1 + moveAmount * 0.035 + dashPower * 0.11 + castPulse * 0.05)
    );
  }
}
