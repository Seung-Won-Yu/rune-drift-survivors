import * as THREE from 'three';

import { PLAYER_SPEED } from '../config/gameTuning.js';

export function updatePlayerPresentation({ player, playerMesh }) {
  if (!playerMesh.current) return;

  const runtime = player.current;
  const mesh = playerMesh.current;
  mesh.position.copy(runtime.pos);

  const yaw = Math.atan2(runtime.facing.x, runtime.facing.z);
  const moveSpeed = runtime.vel.length();
  const moveAmount = THREE.MathUtils.clamp(moveSpeed / (PLAYER_SPEED * 1.2), 0, 1);
  const stride = performance.now() * 0.012;
  const step = Math.sin(stride);
  const stepLift = Math.max(0, step) * moveAmount;
  const dashPower = runtime.dashTimer > 0 ? 1 : 0;
  const castPulse = runtime.castPulse ?? 0;
  const hurtPulse = runtime.hurtPulse ?? 0;
  const bob = (Math.abs(step) * 0.09 + stepLift * 0.04) * moveAmount + dashPower * 0.04;
  const sideSway = Math.sin(stride * 0.5) * 0.072 * moveAmount;
  const tilt = Math.min(0.32, moveSpeed * 0.022) + castPulse * 0.04;
  const dashScale = 1 + dashPower * 0.16;

  mesh.position.y += bob + castPulse * 0.04 + hurtPulse * 0.03;
  mesh.rotation.set(
    -runtime.facing.z * tilt + step * 0.065 * moveAmount - dashPower * 0.12 - hurtPulse * 0.16,
    yaw + sideSway + hurtPulse * Math.sin(stride * 0.8) * 0.12,
    runtime.facing.x * tilt + Math.sin(stride * 0.5) * 0.055 * moveAmount + castPulse * 0.12
  );
  mesh.scale.set(
    dashScale * (1 + stepLift * 0.045 + castPulse * 0.08 + hurtPulse * 0.05),
    dashScale * (1 - stepLift * 0.07 + dashPower * 0.02 - hurtPulse * 0.08),
    dashScale * (1 + moveAmount * 0.035 + dashPower * 0.11 + castPulse * 0.05)
  );
}
