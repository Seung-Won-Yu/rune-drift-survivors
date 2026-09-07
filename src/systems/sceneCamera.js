import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getCameraFrame } from '../config/artDirection.js';

export function updateFollowCamera({
  camera,
  playerPos,
  cameraTarget,
  cameraShake,
  scratch,
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
  const frame = getCameraFrame(camera.aspect);
  camera.position.lerp(
    scratch.cameraPosition.set(cameraTarget.x + shakeX, frame.height + cameraTarget.y * 0.38, cameraTarget.z + frame.depth + shakeZ),
    1 - Math.pow(0.92, dt * 60)
  );
  camera.lookAt(cameraTarget.x, frame.lookHeight + cameraTarget.y * 0.68, cameraTarget.z);
}
