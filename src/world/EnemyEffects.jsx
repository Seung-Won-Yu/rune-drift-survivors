import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ART_TOKENS } from '../config/gameData.js';
import { MAX_ENEMIES } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getEnemyAccentColor } from '../systems/enemyDirector.js';

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
      if (count >= maxAuras && enemy.kind !== 'boss' && enemy.kind !== 'elite') continue;
      if (count >= MAX_ENEMIES) break;
      const pulse = 1 + Math.sin(time + enemy.wobble) * 0.07;
      scratch.euler.set(Math.PI / 2, 0, 0);
      scratch.quat.setFromEuler(scratch.euler);
      scratch.pos.set(enemy.pos.x, enemy.pos.y + 0.035, enemy.pos.z);
      scratch.matrix.compose(
        scratch.pos,
        scratch.quat,
        scratch.scale.setScalar((
          enemy.kind === 'boss'
            ? 3.1 + (enemy.bossGuard > 0 ? 1.0 : 0)
            : enemy.kind === 'elite'
              ? 2.6 + ((enemy.shield ?? 0) > 0 ? 0.56 : 0)
              : enemy.kind === 'brute'
                ? enemy.radius * 2.15
                : enemy.kind === 'runner'
                  ? enemy.radius * 1.62
                  : enemy.radius * 1.88
        ) * pulse)
      );
      auraMesh.current.setMatrixAt(count, scratch.matrix);
      scratch.color.set(getEnemyAccentColor(enemy));
      auraMesh.current.setColorAt(count, scratch.color);
      count += 1;
    }
    auraMesh.current.count = count;
    auraMesh.current.instanceMatrix.needsUpdate = true;
    if (auraMesh.current.instanceColor) auraMesh.current.instanceColor.needsUpdate = true;
  });

  return (
      <instancedMesh ref={auraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
      <ringGeometry args={[0.58, 0.68, 32]} />
      <meshBasicMaterial transparent opacity={0.42} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

export function EnemyAccents({ enemiesRef, visualQuality = 'high' }) {
  const coreMesh = useRef();
  const flashMesh = useRef();
  const hitSparkMesh = useRef();
  const eyeMesh = useRef();
  const runnerTrailMesh = useRef();
  const runnerChevronMesh = useRef();
  const bruteMarkMesh = useRef();
  const brutePlateMesh = useRef();
  const bruteHornMesh = useRef();
  const golemShardMesh = useRef();
  const golemGroundMesh = useRef();
  const eliteCrownMesh = useRef();
  const eliteAuraMesh = useRef();
  const threatRingMesh = useRef();
  const chargeTellMesh = useRef();
  const scratch = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    color: new THREE.Color(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    yAxis: new THREE.Vector3(0, 1, 0)
  }), []);
  const showDecor = visualQuality === 'high';
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 30, 18);

  useFrame(state => {
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const budget = getVisualBudget(visualQuality);
    const maxAccents = Math.min(MAX_ENEMIES, budget.enemyAccents);
    const time = performance.now() * 0.004;
    const visibleEnemies = [];
    const flashingEnemies = [];
    const runnerEnemies = [];
    const bruteEnemies = [];
    const golemEnemies = [];
    const eliteEnemies = [];
    const threatEnemies = [];
    const chargingEnemies = [];

    for (const enemy of enemiesRef.current) {
      const isPriority = enemy.kind === 'boss' || enemy.kind === 'elite';
      if (visibleEnemies.length < MAX_ENEMIES && (visibleEnemies.length < maxAccents || isPriority)) {
        visibleEnemies.push(enemy);
      }
      if (enemy.flash > 0 && flashingEnemies.length < maxAccents + 6) flashingEnemies.push(enemy);
      if (enemy.kind === 'runner' && runnerEnemies.length < maxAccents) runnerEnemies.push(enemy);
      if (enemy.kind === 'brute' && bruteEnemies.length < maxAccents) bruteEnemies.push(enemy);
      if (enemy.kind === 'golem' && golemEnemies.length < maxAccents) golemEnemies.push(enemy);
      if (enemy.kind === 'elite' && eliteEnemies.length < 8) eliteEnemies.push(enemy);
      if ((enemy.kind === 'boss' || enemy.kind === 'elite' || enemy.chargeTimer > 0) && threatEnemies.length < 12) {
        threatEnemies.push(enemy);
      }
      if ((enemy.chargeTimer ?? 0) > 0 && chargingEnemies.length < 8) chargingEnemies.push(enemy);
    }

    if (coreMesh.current) {
      let count = 0;
      for (const enemy of visibleEnemies) {
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
      coreMesh.current.count = count;
      coreMesh.current.instanceMatrix.needsUpdate = true;
      if (coreMesh.current.instanceColor) coreMesh.current.instanceColor.needsUpdate = true;
    }

    if (eyeMesh.current) {
      let count = 0;
      for (const enemy of visibleEnemies) {
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
      eyeMesh.current.count = count;
      eyeMesh.current.instanceMatrix.needsUpdate = true;
      if (eyeMesh.current.instanceColor) eyeMesh.current.instanceColor.needsUpdate = true;
    }

    if (flashMesh.current) {
      let count = 0;
      for (const enemy of flashingEnemies) {
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
        count += 1;
      }
      flashMesh.current.count = count;
      flashMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (hitSparkMesh.current) {
      let count = 0;
      for (const enemy of flashingEnemies) {
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
        scratch.color.set(enemy.kind === 'boss' || enemy.kind === 'elite' ? getEnemyAccentColor(enemy) : '#fff1a6');
        hitSparkMesh.current.setColorAt(count, scratch.color);
        count += 1;
      }
      hitSparkMesh.current.count = count;
      hitSparkMesh.current.instanceMatrix.needsUpdate = true;
      if (hitSparkMesh.current.instanceColor) hitSparkMesh.current.instanceColor.needsUpdate = true;
    }

    if (showDecor && runnerTrailMesh.current) {
      let count = 0;
      for (const enemy of runnerEnemies) {
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
      runnerTrailMesh.current.count = count;
      runnerTrailMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && runnerChevronMesh.current) {
      let count = 0;
      for (const enemy of runnerEnemies) {
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
      runnerChevronMesh.current.count = count;
      runnerChevronMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && bruteMarkMesh.current) {
      let count = 0;
      for (const enemy of bruteEnemies) {
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
      bruteMarkMesh.current.count = count;
      bruteMarkMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && brutePlateMesh.current) {
      let count = 0;
      for (const enemy of bruteEnemies) {
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
      brutePlateMesh.current.count = count;
      brutePlateMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && bruteHornMesh.current) {
      let count = 0;
      for (const enemy of bruteEnemies) {
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
      bruteHornMesh.current.count = count;
      bruteHornMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && golemShardMesh.current) {
      let count = 0;
      for (const enemy of golemEnemies) {
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
      golemShardMesh.current.count = count;
      golemShardMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && golemGroundMesh.current) {
      let count = 0;
      for (const enemy of golemEnemies) {
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
      golemGroundMesh.current.count = count;
      golemGroundMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && eliteCrownMesh.current) {
      let count = 0;
      for (const enemy of eliteEnemies) {
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
      eliteCrownMesh.current.count = count;
      eliteCrownMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (showDecor && eliteAuraMesh.current) {
      let count = 0;
      for (const enemy of eliteEnemies) {
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
      eliteAuraMesh.current.count = count;
      eliteAuraMesh.current.instanceMatrix.needsUpdate = true;
    }

    if (threatRingMesh.current) {
      let count = 0;
      for (const enemy of threatEnemies) {
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
      threatRingMesh.current.count = count;
      threatRingMesh.current.instanceMatrix.needsUpdate = true;
      if (threatRingMesh.current.instanceColor) threatRingMesh.current.instanceColor.needsUpdate = true;
    }

    if (chargeTellMesh.current) {
      let count = 0;
      for (const enemy of chargingEnemies) {
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
      chargeTellMesh.current.count = count;
      chargeTellMesh.current.instanceMatrix.needsUpdate = true;
      if (chargeTellMesh.current.instanceColor) chargeTellMesh.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={threatRingMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.86, 1, 4]} />
        <meshBasicMaterial transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={chargeTellMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 3]} />
        <meshBasicMaterial transparent opacity={0.52} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={coreMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial transparent opacity={0.82} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flashMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <ringGeometry args={[0.62, 0.72, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={hitSparkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial vertexColors transparent opacity={0.86} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={eyeMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.92} toneMapped={false} />
      </instancedMesh>
      {showDecor && (
        <>
          <instancedMesh ref={runnerTrailMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#70d6ff" transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={runnerChevronMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 3]} />
            <meshBasicMaterial color="#9ff7ff" transparent opacity={0.76} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={bruteMarkMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <torusGeometry args={[0.68, 0.045, 8, 28]} />
            <meshBasicMaterial color="#ff8b72" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={brutePlateMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#ffc0a4" transparent opacity={0.76} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={bruteHornMesh} args={[null, null, MAX_ENEMIES * 2]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 4]} />
            <meshBasicMaterial color="#ffcf9c" transparent opacity={0.88} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemShardMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color="#70f0b4" transparent opacity={0.86} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={golemGroundMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.48, 0.58, 4]} />
            <meshBasicMaterial color="#93f5b8" transparent opacity={0.44} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteAuraMesh} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
            <ringGeometry args={[0.58, 0.76, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.48} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={eliteCrownMesh} args={[null, null, MAX_ENEMIES * 4]} frustumCulled={false}>
            <coneGeometry args={[1, 1, 4]} />
            <meshBasicMaterial color={ART_TOKENS.elderViolet} transparent opacity={0.72} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}
