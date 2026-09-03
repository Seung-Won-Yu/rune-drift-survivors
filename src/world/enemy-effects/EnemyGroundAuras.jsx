import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_ENEMIES } from '../../config/gameTuning.js';
import { getVisualBudget } from '../../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../../hooks/useVisualFrameGate.js';
import { getEnemyAccentColor } from '../../systems/enemyDirector.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function EnemyGroundAuras({ enemiesRef, visualQuality = 'high' }) {
  const auraMesh = useRef();
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 24, 16);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler(),
    color: new THREE.Color()
  }), []);

  useFrame(state => {
    if (!auraMesh.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const budget = getVisualBudget(visualQuality);
    const maxAuras = Math.min(MAX_ENEMIES, budget.enemyAuras);
    const time = performance.now() * 0.003;
    let count = 0;
    for (const enemy of enemiesRef.current) {
      if (enemy.kind !== 'boss' && enemy.kind !== 'elite') continue;
      if (count >= maxAuras || count >= MAX_ENEMIES) break;
      const pulse = 1 + Math.sin(time + enemy.wobble) * 0.07;
      scratch.euler.set(Math.PI / 2, 0, 0);
      scratch.quat.setFromEuler(scratch.euler);
      scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.035, enemy.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.setScalar((
          enemy.kind === 'boss'
            ? 2.65 + (enemy.bossGuard > 0 ? 0.72 : 0)
            : 2.05 + ((enemy.shield ?? 0) > 0 ? 0.42 : 0)
        ) * pulse)
      );
      auraMesh.current.setMatrixAt(count, scratch.matrix);
      scratch.color.set(getEnemyAccentColor(enemy));
      auraMesh.current.setColorAt(count, scratch.color);
      count += 1;
    }
    syncInstanceMesh(auraMesh.current, count);
  });

  return (
    <instancedMesh ref={auraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
      <circleGeometry args={[1, 12]} />
      <meshBasicMaterial transparent opacity={0.13} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}
