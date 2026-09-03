import * as THREE from 'three';

import { ART_TOKENS } from '../../config/gameData.js';
import { getEnemyAccentColor } from '../../systems/enemyDirector.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function syncEnemyCoreAccents(meshes, scratch, time) {
  const { coreMesh, eyeMesh, flashMesh, hitSparkMesh } = meshes;
    if (coreMesh.current) {
      let count = 0;
      for (const enemy of scratch.visibleEnemies) {
        const bob = Math.sin(time + enemy.wobble) * 0.08;
        const height = enemy.kind === 'boss'
          ? 2.55
          : enemy.kind === 'elite'
            ? 2.0
            : enemy.kind === 'brute'
              ? 1.42
              : enemy.kind === 'runner'
                ? 0.82
                : 1.22;
        scratch.quat.identity();
        scratch.pos.set(enemy.pos.x, enemy.pos.y + height + bob, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(enemy.kind === 'boss'
            ? 0.46
            : enemy.kind === 'elite'
              ? 0.38
              : enemy.kind === 'brute'
                ? 0.29
                : enemy.kind === 'runner'
                  ? 0.14
                  : 0.22)
        );
        coreMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        coreMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      syncInstanceMesh(coreMesh.current, count);
    }

    if (eyeMesh.current) {
      let count = 0;
      for (const enemy of scratch.visibleEnemies) {
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
        const eyeHeight = enemy.kind === 'boss'
          ? 2.28
          : enemy.kind === 'elite'
            ? 1.74
            : enemy.kind === 'brute'
              ? 1.18
              : enemy.kind === 'runner'
                ? 0.7
                : 1.02;
        const spacing = enemy.kind === 'boss'
          ? 0.52
          : enemy.kind === 'elite'
            ? 0.36
            : enemy.kind === 'brute'
              ? 0.38
              : enemy.kind === 'runner'
                ? 0.16
                : 0.24;
        for (let side = -1; side <= 1; side += 2) {
          scratch.pos.copy(enemy.pos)
            .addScaledVector(scratch.forward, enemy.radius * 0.78)
            .addScaledVector(scratch.right, side * spacing);
          scratch.pos.y = enemy.pos.y + eyeHeight;
          scratch.quat.setFromAxisAngle(scratch.yAxis, enemy.facingAngle);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(
              enemy.kind === 'boss' ? 0.18 : enemy.kind === 'brute' ? 0.15 : 0.11,
              enemy.kind === 'boss' ? 0.26 : enemy.kind === 'runner' ? 0.13 : 0.17,
              0.08
            )
          );
          eyeMesh.current.setMatrixAt(count, scratch.matrix);
          scratch.color.set(enemy.kind === 'runner' ? ART_TOKENS.runeCyan : enemy.kind === 'brute' ? ART_TOKENS.dangerRed : enemy.kind === 'golem' ? ART_TOKENS.runeMint : getEnemyAccentColor(enemy));
          eyeMesh.current.setColorAt(count, scratch.color);
          count += 1;
        }
      }
      syncInstanceMesh(eyeMesh.current, count);
    }

    if (flashMesh.current) {
      let count = 0;
      for (const enemy of scratch.flashingEnemies) {
        if (enemy.kind === 'boss') continue;
        scratch.euler.set(Math.PI / 2, 0, enemy.wobble);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.08, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(enemy.hitRadius * 1.08)
        );
        flashMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(getEnemyAccentColor(enemy));
        flashMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      syncInstanceMesh(flashMesh.current, count);
    }

    if (hitSparkMesh.current) {
      let count = 0;
      for (const enemy of scratch.flashingEnemies) {
        const hitPower = THREE.MathUtils.clamp(enemy.flash / 0.18, 0, 1);
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.copy(enemy.pos).addScaledVector(scratch.forward, enemy.radius * 0.72);
        scratch.pos.y = enemy.pos.y + (enemy.kind === 'runner' ? 0.72 : enemy.kind === 'brute' ? 1.32 : enemy.kind === 'elite' ? 1.8 : 1.02);
        scratch.euler.set(0.56, enemy.facingAngle + enemy.wobble * 0.2, Math.PI / 4);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar((0.18 + enemy.radius * 0.22) * (0.8 + hitPower * 0.7))
        );
        hitSparkMesh.current.setMatrixAt(count, scratch.matrix);
        scratch.color.set(enemy.kind === 'boss' || enemy.kind === 'elite' ? getEnemyAccentColor(enemy) : '#d4a84c');
        hitSparkMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      syncInstanceMesh(hitSparkMesh.current, count);
    }
}
