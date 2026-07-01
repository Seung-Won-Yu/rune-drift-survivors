import { ARENA_RADIUS } from '../config/gameTuning.js';

export function updateFollowCamera({
  camera,
  playerPos,
  cameraTarget,
  cameraShake,
  scratch,
  compactCamera,
  visualQuality,
  dt
}) {
  const framedTarget = scratch.vec.copy(playerPos);
  const frameRadius = ARENA_RADIUS - 38;
  const flatTarget = scratch.flat.set(framedTarget.x, framedTarget.z);
  if (flatTarget.length() > frameRadius) {
    flatTarget.setLength(frameRadius);
    framedTarget.x = flatTarget.x;
    framedTarget.z = flatTarget.y;
  }
  cameraTarget.lerp(framedTarget, 1 - Math.pow(0.001, dt));
  cameraShake.current = Math.max(0, cameraShake.current - dt * 1.35);
  const shake = cameraShake.current;
  const shakeX = (Math.random() - 0.5) * shake;
  const shakeZ = (Math.random() - 0.5) * shake;
  const cameraHeight = compactCamera ? 38 : visualQuality === 'balanced' ? 42 : 44;
  const cameraDepth = compactCamera ? 64 : visualQuality === 'balanced' ? 70 : 74;
  camera.position.lerp(
    scratch.cameraPosition.set(cameraTarget.x + shakeX, cameraHeight + cameraTarget.y * 0.38, cameraTarget.z + cameraDepth + shakeZ),
    0.08
  );
  camera.lookAt(cameraTarget.x, (compactCamera ? 0.82 : 0.62) + cameraTarget.y * 0.68, cameraTarget.z);
}
