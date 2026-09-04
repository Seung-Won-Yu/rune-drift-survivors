import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_PROJECTILES } from '../../config/gameTuning.js';
import { getVisualBudget } from '../../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../../hooks/useVisualFrameGate.js';
import { getOrbColor, getStormColor, getWeaponStage, getWeaponTier } from '../../systems/progression.js';
import { getCombatEffectTextures } from '../combatEffectTextures.js';
import { syncInstanceMesh } from '../instancedMeshUtils.js';

export function ProjectileAuraRings({ projectilesRef, game, visualQuality = 'high' }) {
  const orbRing = useRef();
  const orbHalo = useRef();
  const orbTrail = useRef();
  const orbCrown = useRef();
  const stormDisk = useRef();
  const stormCore = useRef();
  const stormPulseTexture = useMemo(() => getCombatEffectTextures().stormPulse, []);
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    euler: new THREE.Euler()
  }), []);
  const showDetail = visualQuality !== 'low';
  const renderStage = getWeaponStage(game);
  const orbColor = getOrbColor(game.stats, renderStage);
  const stormColor = getStormColor(game.stats, renderStage);
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 30, 18);

  useFrame(state => {
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    const now = performance.now();
    const budget = getVisualBudget(visualQuality);
    const auraLimit = Math.min(MAX_PROJECTILES, budget.projectileAura);
    const detailLimit = Math.min(MAX_PROJECTILES, budget.projectileDetail);
    const stage = getWeaponStage(game);
    const tier = getWeaponTier(game.stats, stage);
    const evolved = stage > 0 || tier > 1.08 || game.stats.pierce > 0 || game.stats.cooldown < 0.96;
    if (orbRing.current) {
      let count = 0;
      if (evolved) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= auraLimit) break;
          local.euler.set(Math.PI / 2, 0, projectile.angle + now * (0.006 + stage * 0.001));
          local.quat.setFromEuler(local.euler);
          local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((0.84 + stage * 0.16) * projectile.visualScale));
          orbRing.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      syncInstanceMesh(orbRing.current, count);
    }

    if (orbHalo.current) {
      let count = 0;
      if (stage > 1) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= detailLimit) break;
          local.euler.set(Math.PI / 2, 0, -projectile.angle + now * 0.004);
          local.quat.setFromEuler(local.euler);
          local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((1.08 + stage * 0.2) * projectile.visualScale));
          orbHalo.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      syncInstanceMesh(orbHalo.current, count);
    }

    if (orbTrail.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'orb') continue;
        if (count >= auraLimit) break;
        const length = projectile.trailLength ?? 1;
        local.pos.set(
          projectile.pos.x - Math.sin(projectile.angle) * length * 0.42,
          projectile.pos.y - 0.02,
          projectile.pos.z - Math.cos(projectile.angle) * length * 0.42
        );
        local.euler.set(-Math.PI / 2, 0, -projectile.angle);
        local.quat.setFromEuler(local.euler);
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.18 + stage * 0.06, length, 1));
        orbTrail.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      syncInstanceMesh(orbTrail.current, count);
    }

    if (orbCrown.current) {
      let count = 0;
      if (stage >= 3) {
        for (const projectile of projectilesRef.current) {
          if (projectile.type !== 'orb') continue;
          if (count >= detailLimit * 3) break;
          for (let i = 0; i < 3; i += 1) {
            if (count >= detailLimit * 3) break;
            const spin = projectile.angle + now * 0.008 + i * Math.PI * 2 / 3;
            local.pos.set(
              projectile.pos.x + Math.cos(spin) * 0.42 * projectile.visualScale,
              projectile.pos.y + Math.sin(now * 0.006 + i) * 0.08,
              projectile.pos.z + Math.sin(spin) * 0.42 * projectile.visualScale
            );
            local.euler.set(0.6, -spin, 0.2);
            local.quat.setFromEuler(local.euler);
            local.matrix.compose(local.pos, local.quat, local.scale.setScalar(0.12 * projectile.visualScale));
            orbCrown.current.setMatrixAt(count, local.matrix);
            count += 1;
          }
        }
      }
      syncInstanceMesh(orbCrown.current, count);
    }

    if (stormDisk.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= auraLimit) break;
        local.euler.set(Math.PI / 2, 0, -now * 0.003 + projectile.angle);
        local.quat.setFromEuler(local.euler);
        local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar(projectile.burstRadius ?? 1.8));
        stormDisk.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      syncInstanceMesh(stormDisk.current, count);
    }

    if (showDetail && stormCore.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= detailLimit) break;
        local.pos.copy(projectile.pos);
        local.pos.y += 0.1 + Math.sin(now * 0.009 + projectile.angle) * 0.03;
        local.euler.set(0.52, -now * 0.008 + projectile.angle, 0.18);
        local.quat.setFromEuler(local.euler);
        local.matrix.compose(local.pos, local.quat, local.scale.setScalar((0.22 + stage * 0.045) * projectile.visualScale));
        stormCore.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      syncInstanceMesh(stormCore.current, count);
    }
  });

  return (
    <>
      <instancedMesh ref={orbTrail} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <circleGeometry args={[1, 3]} />
        <meshBasicMaterial color={orbColor} transparent opacity={0.16 + renderStage * 0.025} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.45, 0.018, 8, 32]} />
        <meshBasicMaterial color={orbColor} transparent opacity={0.74} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbHalo} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.68, 0.012, 8, 42]} />
        <meshBasicMaterial color="#d4a84c" transparent opacity={0.24} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbCrown} args={[null, null, MAX_PROJECTILES * 3]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#d4a84c" transparent opacity={0.52} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormDisk} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={stormPulseTexture} color={stormColor} transparent opacity={0.48 + renderStage * 0.035} alphaTest={0.01} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      {showDetail && (
        <instancedMesh ref={stormCore} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={stormColor} transparent opacity={0.64} toneMapped={false} />
        </instancedMesh>
      )}
    </>
  );
}
