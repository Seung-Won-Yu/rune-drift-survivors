import { MAX_ENEMIES } from '../../config/gameTuning.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function syncCommonRoleAccents(meshes, scratch, showDecor, maxAccents) {
  const {
    runnerTrailMesh,
    runnerChevronMesh,
    bruteMarkMesh,
    brutePlateMesh,
    bruteHornMesh,
    golemShardMesh,
    golemGroundMesh
  } = meshes;
    if (showDecor && runnerTrailMesh.current) {
      let count = 0;
      for (const enemy of scratch.runnerEnemies) {
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.set(enemy.pos.x - scratch.forward.x * 0.78, enemy.pos.y + 0.13, enemy.pos.z - scratch.forward.z * 0.78);
        scratch.euler.set(-Math.PI / 2, 0, -enemy.facingAngle);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.2, 1.26 + Math.sin(enemy.wobble * 1.6) * 0.16, 1)
        );
        runnerTrailMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(runnerTrailMesh.current, count);
    }

    if (showDecor && runnerChevronMesh.current) {
      let count = 0;
      for (const enemy of scratch.runnerEnemies) {
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.pos.set(enemy.pos.x + scratch.forward.x * 0.42, enemy.pos.y + 0.28, enemy.pos.z + scratch.forward.z * 0.42);
        scratch.euler.set(Math.PI / 2, 0, -enemy.facingAngle + Math.PI);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.28, 0.72 + Math.sin(enemy.wobble * 2.1) * 0.07, 0.22)
        );
        runnerChevronMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(runnerChevronMesh.current, count);
    }

    if (showDecor && bruteMarkMesh.current) {
      let count = 0;
      for (const enemy of scratch.bruteEnemies) {
        scratch.euler.set(Math.PI / 2, 0, enemy.wobble * 0.35);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 1.56, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(0.88 + Math.sin(enemy.wobble) * 0.06)
        );
        bruteMarkMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(bruteMarkMesh.current, count);
    }

    if (showDecor && brutePlateMesh.current) {
      let count = 0;
      for (const enemy of scratch.bruteEnemies) {
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
        for (let side = -1; side <= 1; side += 2) {
          if (count >= maxAccents * 2) break;
          if (count >= MAX_ENEMIES * 2) break;
          scratch.pos.copy(enemy.pos)
            .addScaledVector(scratch.forward, -0.16)
            .addScaledVector(scratch.right, side * 0.58);
          scratch.pos.y = enemy.pos.y + 1.23 + Math.sin(enemy.wobble + side) * 0.035;
          scratch.quat.setFromAxisAngle(scratch.yAxis, enemy.facingAngle + side * 0.24);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(0.5, 0.26, 0.2)
          );
          brutePlateMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      syncInstanceMesh(brutePlateMesh.current, count);
    }

    if (showDecor && bruteHornMesh.current) {
      let count = 0;
      for (const enemy of scratch.bruteEnemies) {
        scratch.forward.set(Math.sin(enemy.facingAngle), 0, Math.cos(enemy.facingAngle));
        scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
        for (let side = -1; side <= 1; side += 2) {
          if (count >= maxAccents * 2) break;
          scratch.pos.copy(enemy.pos)
            .addScaledVector(scratch.forward, 0.22)
            .addScaledVector(scratch.right, side * 0.45);
          scratch.pos.y = enemy.pos.y + 1.72 + Math.sin(enemy.wobble + side) * 0.04;
          scratch.euler.set(0.34, enemy.facingAngle + side * 0.28, side * 0.42);
          scratch.quat.setFromEuler(scratch.euler);
          scratch.matrix.compose(
            scratch.pos,
            scratch.quat,
            scratch.scale.set(0.16, 0.52, 0.16)
          );
          bruteHornMesh.current.setMatrixAt(count, scratch.matrix);
          count += 1;
        }
      }
      syncInstanceMesh(bruteHornMesh.current, count);
    }

    if (showDecor && golemShardMesh.current) {
      let count = 0;
      for (const enemy of scratch.golemEnemies) {
        scratch.euler.set(0.38, enemy.facingAngle + Math.PI / 4, 0.16);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 1.36 + Math.sin(enemy.wobble) * 0.035, enemy.pos.z);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.set(0.24, 0.44, 0.2)
        );
        golemShardMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(golemShardMesh.current, count);
    }

    if (showDecor && golemGroundMesh.current) {
      let count = 0;
      for (const enemy of scratch.golemEnemies) {
        scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.045, enemy.pos.z);
        scratch.euler.set(Math.PI / 2, 0, enemy.facingAngle + Math.PI / 4);
        scratch.quat.setFromEuler(scratch.euler);
        scratch.matrix.compose(
          scratch.pos,
          scratch.quat,
          scratch.scale.setScalar(1.36 + Math.sin(enemy.wobble * 0.65) * 0.035)
        );
        golemGroundMesh.current.setMatrixAt(count, scratch.matrix);
        count += 1;
      }
      syncInstanceMesh(golemGroundMesh.current, count);
    }
}

