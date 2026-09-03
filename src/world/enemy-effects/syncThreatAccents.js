import { MAX_ENEMIES } from '../../config/gameTuning.js';
import { getEnemyAccentColor } from '../../systems/enemyDirector.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function syncThreatAccents(meshes, scratch, showDecor, time) {
  const { eliteCrownMesh, eliteAuraMesh, threatRingMesh, chargeTellMesh } = meshes;
    if (showDecor && eliteCrownMesh.current) {
      let count = 0;
      for (const enemy of scratch.eliteEnemies) {
        for (let i = 0; i < 4; i += 1) {
          if (count >= MAX_ENEMIES * 4) break;
          const angle = enemy.wobble * 0.6 + i * Math.PI * 2 / 4;
          scratch.euler.set(0.35, -angle, 0.25);
          scratch.quat.setFromEuler(scratch.euler);
          scratch.pos.set(
            enemy.pos.x + Math.cos(angle) * 0.9,
            enemy.pos.y + 2.28 + Math.sin(time + i) * 0.05,
            enemy.pos.z + Math.sin(angle) * 0.9
          );
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(0.14, 0.42, 0.14)
          );
          eliteCrownMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      syncInstanceMesh(eliteCrownMesh.current, count);
    }

    if (showDecor && eliteAuraMesh.current) {
      let count = 0;
      for (const enemy of scratch.eliteEnemies) {
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.07, enemy.pos.z);
        scratch.euler.set(Math.PI / 2, 0, -enemy.wobble * 0.28);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(1.62 + ((enemy.shield ?? 0) > 0 ? 0.36 : 0) + Math.sin(time + enemy.wobble) * 0.05)
        );
        eliteAuraMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(eliteAuraMesh.current, count);
    }

    if (threatRingMesh.current) {
      let count = 0;
      for (const enemy of scratch.threatEnemies) {
        const chargePulse = enemy.chargeTimer > 0 ? 0.34 : 0;
        const shieldPulse = (enemy.shield ?? 0) > 0 ? 0.16 : 0;
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.09, enemy.pos.z);
        scratch.euler.set(Math.PI / 2, 0, time * 0.42 + enemy.wobble * 0.16);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(
            enemy.kind === 'boss'
              ? 3.75 + chargePulse
              : enemy.kind === 'elite'
                ? 2.18 + shieldPulse + chargePulse
                : enemy.hitRadius * 1.45
          )
        );
        threatRingMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        threatRingMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      syncInstanceMesh(threatRingMesh.current, count);
    }

    if (chargeTellMesh.current) {
      let count = 0;
      for (const enemy of scratch.chargingEnemies) {
        const chargeTimer = enemy.chargeTimer ?? 0;
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.copy(enemy.pos).addScaledVector(scratch.forward, enemy.hitRadius * 1.45);
        scratch.pos.y = enemy.pos.y + 0.18;
        scratch.euler.set(Math.PI / 2, 0, -enemy.facingAngle + Math.PI);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.76, 1.46 + chargeTimer * 0.45, 1)
        );
        chargeTellMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        chargeTellMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      syncInstanceMesh(chargeTellMesh.current, count);
    }
}

