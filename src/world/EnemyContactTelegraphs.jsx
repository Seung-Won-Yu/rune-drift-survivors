import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_ENEMIES } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getEnemyAccentColor } from '../systems/enemyDirector.js';
import {
  getEnemyContactReach,
  getEnemyContactWindupProgress
} from '../systems/enemyContactRuntime.js';
import { syncInstanceMesh } from './instancedMeshUtils.js';

const CONTACT_PRIORITY = Object.freeze({ boss: 5, elite: 4, brute: 3, golem: 2, runner: 1 });

export function EnemyContactTelegraphs({ enemiesRef, visualQuality = 'balanced' }) {
  const reachMesh = useRef();
  const countdownMesh = useRef();
  const impactMesh = useRef();
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 36, 24);
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color(),
    dangerColor: new THREE.Color('#f28b63'),
    active: [],
    impacts: []
  }), []);

  useFrame(state => {
    if (!reachMesh.current || !countdownMesh.current || !impactMesh.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;

    const visualBudget = getVisualBudget(visualQuality);
    const maxTelegraphs = Math.min(
      MAX_ENEMIES,
      visualQuality === 'high' ? visualBudget.enemyAccents : Math.max(6, visualBudget.enemyAccents)
    );
    scratch.active.length = 0;
    scratch.impacts.length = 0;
    for (const enemy of enemiesRef.current) {
      if ((enemy.contactAttackTimer ?? 0) > 0) scratch.active.push(enemy);
      if ((enemy.contactAttackPulse ?? 0) > 0) scratch.impacts.push(enemy);
    }
    scratch.active.sort((left, right) => (
      (CONTACT_PRIORITY[right.kind] ?? 0) - (CONTACT_PRIORITY[left.kind] ?? 0)
      || getEnemyContactWindupProgress(right) - getEnemyContactWindupProgress(left)
    ));

    let count = 0;
    for (const enemy of scratch.active) {
      if (count >= maxTelegraphs) break;
      const reach = getEnemyContactReach(enemy);
      const progress = getEnemyContactWindupProgress(enemy);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 15 + enemy.wobble) * 0.025;
      scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.075, enemy.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.setScalar(reach * pulse)
      );
      reachMesh.current.setMatrixAt(count, scratch.matrix);
      scratch.color.set(getEnemyAccentColor(enemy)).lerp(scratch.dangerColor, progress * 0.68);
      reachMesh.current.setColorAt(count, scratch.color);

      scratch.pos.y += 0.012;
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.setScalar(reach * (0.28 + progress * 0.72))
      );
      countdownMesh.current.setMatrixAt(count, scratch.matrix);
      countdownMesh.current.setColorAt(count, scratch.color);
      count += 1;
    }
    syncInstanceMesh(reachMesh.current, count);
    syncInstanceMesh(countdownMesh.current, count);

    count = 0;
    for (const enemy of scratch.impacts) {
      if (count >= maxTelegraphs) break;
      const progress = 1 - enemy.contactAttackPulse / 0.34;
      scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.1, enemy.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.setScalar(getEnemyContactReach(enemy) * (0.78 + progress * 0.48))
      );
      impactMesh.current.setMatrixAt(count, scratch.matrix);
      count += 1;
    }
    syncInstanceMesh(impactMesh.current, count);
  });

  return (
    <>
      <instancedMesh ref={reachMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.91, 1, 32]} />
        <meshBasicMaterial transparent opacity={0.68} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={countdownMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.78, 0.91, 32]} />
        <meshBasicMaterial transparent opacity={0.38} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={impactMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.76, 0.98, 32]} />
        <meshBasicMaterial color="#ffc08e" transparent opacity={0.56} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </>
  );
}
