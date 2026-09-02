import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_PROJECTILES } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getOrbColor, getStormColor, getWeaponStage, getWeaponTier } from '../systems/progression.js';
import { getCombatEffectTextures } from './combatEffectTextures.js';
import { syncInstanceMesh } from './instancedMeshUtils.js';

export function WeaponStrikeEffects({ effectsRef, visualQuality = 'high' }) {
  const effectLimit = getVisualBudget(visualQuality).weaponEffects;
  return (
    <>
      {effectsRef.current.slice(0, effectLimit).map((effect, index) => {
        if (effect.type === 'beam') {
          return <BeamEffect key={`beam-${index}-${effect.maxLife}`} effect={effect} visualQuality={visualQuality} />;
        }
        return <RingEffect key={`ring-${index}-${effect.maxLife}`} effect={effect} visualQuality={visualQuality} />;
      })}
    </>
  );
}

function getReadableEffectColor(color, fallback = '#d4a84c') {
  try {
    const parsed = new THREE.Color(color || fallback);
    const luminance = parsed.r * 0.2126 + parsed.g * 0.7152 + parsed.b * 0.0722;
    return luminance < 0.12 ? fallback : (color || fallback);
  } catch {
    return fallback;
  }
}

function BeamEffect({ effect, visualQuality = 'high' }) {
  const progress = 1 - effect.life / effect.maxLife;
  const from = effect.from;
  const to = effect.to;
  const direction = to.clone().sub(from);
  const length = Math.max(0.01, direction.length());
  const midpoint = from.clone().add(to).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  const opacity = Math.max(0, 0.92 - progress * 0.92);
  const pulse = 1 + Math.sin(progress * Math.PI) * 0.42;
  const showGlow = visualQuality !== 'low';
  const showCore = visualQuality === 'high';
  const color = getReadableEffectColor(effect.color);
  const isThreat = effect.signal === 'threat';
  const beamColor = isThreat ? '#f07b62' : color;

  return (
    <group position={midpoint} quaternion={quaternion}>
      <mesh scale={[effect.width, length, effect.width]}>
        <cylinderGeometry args={[1, 1, 1, visualQuality === 'low' ? 5 : 8, 1, true]} />
        <meshBasicMaterial color={beamColor} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      {showGlow && (
        <mesh scale={[effect.width * 2.4, length * 0.96, effect.width * 2.4]}>
          <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.16} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {showCore && (
        <mesh position={[0, 0, 0]} scale={[effect.width * 3.2 * pulse, effect.width * 3.2 * pulse, effect.width * 3.2 * pulse]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={isThreat ? '#ffbe94' : color} transparent opacity={opacity * 0.34} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function RingEffect({ effect, visualQuality = 'high' }) {
  const progress = 1 - effect.life / effect.maxLife;
  const signal = effect.signal ?? 'attack';
  const isThreat = signal === 'threat' || signal === 'threat-impact';
  const isRitual = signal === 'reward' || signal === 'objective';
  const radius = effect.radius * (0.34 + progress * 0.78);
  const opacity = Math.max(0, 0.54 - progress * 0.54);
  const ringSegments = isRitual ? 4 : visualQuality === 'low' ? 14 : 20;
  const markerCount = visualQuality === 'low' || isThreat ? 0 : 4;
  const color = getReadableEffectColor(effect.color);
  const outerColor = isThreat ? '#f07b62' : color;

  return (
    <group position={[effect.pos.x, effect.pos.y + 0.05, effect.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, isRitual ? Math.PI / 4 : progress * Math.PI * 0.24]} scale={[radius * 0.9, radius * 0.9, 1]}>
        <circleGeometry args={[1, isRitual ? 4 : ringSegments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * (isThreat ? 0.08 : 0.13)} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI]} scale={[radius, radius, 1]}>
        <ringGeometry args={[0.91, 1, ringSegments, 1, Math.PI * 0.08, isThreat ? Math.PI * 2 : Math.PI * 1.48]} />
        <meshBasicMaterial color={outerColor} transparent opacity={opacity * (isThreat ? 0.72 : 0.52)} depthWrite={false} toneMapped={false} />
      </mesh>
      {Array.from({ length: markerCount }, (_, index) => {
        const angle = index * Math.PI / 2 + progress * 0.42;
        return (
          <mesh
            key={`impact-marker-${index}`}
            position={[Math.cos(angle) * radius * 0.7, 0.1, Math.sin(angle) * radius * 0.7]}
            rotation={[0, -angle, Math.PI / 4]}
            scale={[0.08, 0.05, Math.max(0.28, radius * 0.075)]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * 0.68} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {isRitual && visualQuality !== 'low' && (
        <mesh position={[0, 0.12 + progress * 0.18, 0]} rotation={[0.45, progress * Math.PI, Math.PI / 4]} scale={[0.18, 0.25, 0.18]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.54} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

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
        <>
          <instancedMesh ref={stormCore} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={stormColor} transparent opacity={0.64} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}
