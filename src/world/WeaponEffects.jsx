import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { MAX_PROJECTILES } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import { getOrbColor, getStormColor, getWeaponStage, getWeaponTier } from '../systems/progression.js';

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

function getReadableEffectColor(color, fallback = '#fff1a6') {
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

  return (
    <group position={midpoint} quaternion={quaternion}>
      <mesh scale={[effect.width, length, effect.width]}>
        <cylinderGeometry args={[1, 1, 1, visualQuality === 'low' ? 5 : 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      {showGlow && (
        <mesh scale={[effect.width * 2.4, length * 0.96, effect.width * 2.4]}>
          <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.2} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {showCore && (
        <mesh position={[0, 0, 0]} scale={[effect.width * 3.2 * pulse, effect.width * 3.2 * pulse, effect.width * 3.2 * pulse]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.42} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function RingEffect({ effect, visualQuality = 'high' }) {
  const progress = 1 - effect.life / effect.maxLife;
  const radius = effect.radius * (0.26 + progress * 0.92);
  const opacity = Math.max(0, 0.62 - progress * 0.62);
  const ringSegments = visualQuality === 'low' ? 28 : visualQuality === 'balanced' ? 48 : 72;
  const showSecondary = visualQuality !== 'low';
  const showTertiary = visualQuality === 'high';
  const color = getReadableEffectColor(effect.color);

  return (
    <group position={[effect.pos.x, effect.pos.y + 0.05, effect.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI]} scale={[radius, radius, 1]}>
        <ringGeometry args={[0.84, 1, ringSegments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      {showSecondary && (
        <mesh rotation={[-Math.PI / 2, 0, -progress * Math.PI * 0.78]} scale={[radius * 0.9, radius * 0.9, 1]}>
          <ringGeometry args={[0.62, 0.68, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.24} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
      {showTertiary && (
        <mesh rotation={[-Math.PI / 2, 0, -progress * Math.PI * 0.5]} scale={[radius * 0.68, radius * 0.68, 1]}>
          <ringGeometry args={[0.38, 0.46, 6]} />
          <meshBasicMaterial color="#fff1a6" transparent opacity={opacity * 0.44} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {effect.type === 'ring' && showSecondary && (
        <mesh position={[0, 0.18 + progress * 0.28, 0]} scale={[0.24 + progress * 0.1, 0.24 + progress * 0.1, 0.24 + progress * 0.1]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.58} depthWrite={false} toneMapped={false} />
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
  const stormRing = useRef();
  const stormDisk = useRef();
  const stormSpoke = useRef();
  const stormCore = useRef();
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
      orbRing.current.count = count;
      orbRing.current.instanceMatrix.needsUpdate = true;
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
      orbHalo.current.count = count;
      orbHalo.current.instanceMatrix.needsUpdate = true;
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
      orbTrail.current.count = count;
      orbTrail.current.instanceMatrix.needsUpdate = true;
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
      orbCrown.current.count = count;
      orbCrown.current.instanceMatrix.needsUpdate = true;
    }

    if (stormRing.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= auraLimit) break;
        local.euler.set(Math.PI / 2, 0, now * 0.004 + projectile.angle);
        local.quat.setFromEuler(local.euler);
        local.matrix.compose(projectile.pos, local.quat, local.scale.setScalar((1.2 + stage * 0.12) * projectile.visualScale * tier));
        stormRing.current.setMatrixAt(count, local.matrix);
        count += 1;
      }
      stormRing.current.count = count;
      stormRing.current.instanceMatrix.needsUpdate = true;
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
      stormDisk.current.count = count;
      stormDisk.current.instanceMatrix.needsUpdate = true;
    }

    if (showDetail && stormSpoke.current) {
      let count = 0;
      for (const projectile of projectilesRef.current) {
        if (projectile.type !== 'storm') continue;
        if (count >= detailLimit * 4) break;
        const radius = projectile.burstRadius ?? 1.8;
        for (let i = 0; i < 4; i += 1) {
          if (count >= detailLimit * 4) break;
          if (count >= MAX_PROJECTILES * 4) break;
          const spokeAngle = projectile.angle + now * 0.006 + i * Math.PI / 2;
          local.pos.copy(projectile.pos);
          local.pos.y += 0.04;
          local.euler.set(-Math.PI / 2, 0, -spokeAngle);
          local.quat.setFromEuler(local.euler);
          local.matrix.compose(local.pos, local.quat, local.scale.set(0.12 + stage * 0.015, radius * 0.92, 1));
          stormSpoke.current.setMatrixAt(count, local.matrix);
          count += 1;
        }
      }
      stormSpoke.current.count = count;
      stormSpoke.current.instanceMatrix.needsUpdate = true;
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
      stormCore.current.count = count;
      stormCore.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={orbTrail} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={orbColor} transparent opacity={0.22 + renderStage * 0.035} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.45, 0.018, 8, 32]} />
        <meshBasicMaterial color={orbColor} transparent opacity={0.74} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbHalo} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.68, 0.012, 8, 42]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.3} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={orbCrown} args={[null, null, MAX_PROJECTILES * 3]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.66} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormDisk} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <circleGeometry args={[1, 56]} />
        <meshBasicMaterial color={stormColor} transparent opacity={0.1 + renderStage * 0.02} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stormRing} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
        <torusGeometry args={[0.92, 0.022, 8, 40]} />
        <meshBasicMaterial color={stormColor} transparent opacity={0.48} toneMapped={false} />
      </instancedMesh>
      {showDetail && (
        <>
          <instancedMesh ref={stormSpoke} args={[null, null, MAX_PROJECTILES * 4]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={stormCore} args={[null, null, MAX_PROJECTILES]} frustumCulled={false}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={stormColor} transparent opacity={0.64} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </>
  );
}
