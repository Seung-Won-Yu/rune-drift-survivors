import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { MODEL_URLS, PROJECTILE_MODEL_URLS } from '../config/assets.js';
import { ART_TOKENS } from '../config/gameData.js';
import { MAX_ORBIT_BLADES, PLAYER_SPEED, PLAYER_VISUAL_BASE_SCALE } from '../config/gameTuning.js';
import { getBladeCount, getBuildFocus, getDominantBuild, getOrbColor, getWeaponStage, isWeaponFamilyUnlocked } from '../systems/progression.js';
import { useInstancedModelParts } from './StaticModelInstances.jsx';

export function PlayerAvatar({ rootRef, game, player, visualQuality = 'high' }) {
  const runeGroup = useRef();
  const crestGroup = useRef();
  const cloakMesh = useRef();
  const leftStrideMesh = useRef();
  const rightStrideMesh = useRef();
  const staffTrailMesh = useRef();
  const shoulderSash = useRef();
  const bodyShell = useRef();
  const castArcMesh = useRef();
  const hurtGuardMesh = useRef();
  const hurtShardMesh = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const simplifiedVfx = visualQuality !== 'high';
  const runeCount = simplifiedVfx
    ? Math.min(5, 2 + Math.min(stage, 2) + Math.floor(focus / 4))
    : Math.min(10, 3 + stage + game.stats.pierce + Math.floor(focus / 2));
  const runeColor = dominantBuild?.color ?? getOrbColor(game.stats, stage);

  useFrame(() => {
    const now = performance.now();
    const speed = player?.current?.vel?.length?.() ?? 0;
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.16), 0, 1);
    const dashPower = player?.current?.dashTimer > 0 ? 1 : 0;
    const castPulse = player?.current?.castPulse ?? 0;
    const hurtPulse = player?.current?.hurtPulse ?? 0;
    const stride = now * 0.013;
    if (bodyShell.current) {
      const step = Math.sin(stride);
      bodyShell.current.position.set(0, Math.abs(step) * 0.046 * moveAmount + castPulse * 0.06 + hurtPulse * 0.052, 0);
      bodyShell.current.rotation.set(
        -0.05 * moveAmount + castPulse * 0.12 - hurtPulse * 0.18,
        Math.sin(stride * 0.5) * 0.044 * moveAmount + hurtPulse * Math.sin(stride * 1.4) * 0.08,
        Math.sin(stride) * 0.056 * moveAmount + castPulse * 0.13
      );
      bodyShell.current.scale.set(
        1 + castPulse * 0.065 + hurtPulse * 0.045,
        1 - hurtPulse * 0.075,
        1 + dashPower * 0.052 + castPulse * 0.038
      );
    }
    if (runeGroup.current) runeGroup.current.rotation.y += 0.018 + game.stats.cooldown * 0.004;
    if (crestGroup.current) {
      crestGroup.current.rotation.y -= 0.012 + stage * 0.002 + castPulse * 0.012;
      crestGroup.current.rotation.z = castPulse * 0.16 - hurtPulse * 0.08;
      crestGroup.current.position.y = 1.55 + Math.sin(now * 0.004) * 0.05 + moveAmount * 0.035 + castPulse * 0.08;
    }
    if (cloakMesh.current) {
      cloakMesh.current.visible = moveAmount > 0.04 || dashPower > 0;
      cloakMesh.current.position.set(0, 0.75 + Math.sin(stride * 0.5) * 0.035, -0.56 - moveAmount * 0.22 - dashPower * 0.24);
      cloakMesh.current.rotation.set(0.25 + moveAmount * 0.2 + castPulse * 0.12 + hurtPulse * 0.1, Math.sin(stride * 0.52) * 0.1, Math.sin(stride) * 0.075 * moveAmount + hurtPulse * 0.08);
      cloakMesh.current.scale.set(0.62 + dashPower * 0.32 + castPulse * 0.12, 1.08 + moveAmount * 0.5 + dashPower * 0.58 + castPulse * 0.24, 1);
      cloakMesh.current.material.opacity = 0.2 + moveAmount * 0.12 + dashPower * 0.18 + castPulse * 0.14;
    }
    if (leftStrideMesh.current && rightStrideMesh.current) {
      const leftStep = Math.max(0, Math.sin(stride));
      const rightStep = Math.max(0, Math.sin(stride + Math.PI));
      leftStrideMesh.current.visible = moveAmount > 0.08;
      rightStrideMesh.current.visible = moveAmount > 0.08;
      leftStrideMesh.current.position.set(-0.24, 0.18 + leftStep * 0.12, 0.12 + leftStep * 0.2);
      rightStrideMesh.current.position.set(0.24, 0.18 + rightStep * 0.12, 0.12 + rightStep * 0.2);
      leftStrideMesh.current.rotation.set(0.72, -0.24 + leftStep * 0.18, -0.28);
      rightStrideMesh.current.rotation.set(0.72, 0.24 - rightStep * 0.18, 0.28);
      leftStrideMesh.current.scale.set(0.14 + leftStep * 0.05, 0.5 + leftStep * 0.2 + dashPower * 0.12, 0.1);
      rightStrideMesh.current.scale.set(0.14 + rightStep * 0.05, 0.5 + rightStep * 0.2 + dashPower * 0.12, 0.1);
    }
    if (staffTrailMesh.current) {
      staffTrailMesh.current.visible = moveAmount > 0.06 || dashPower > 0 || castPulse > 0.02;
      staffTrailMesh.current.position.set(0.38 + Math.sin(stride * 0.5) * 0.04, 1.02 + Math.sin(stride) * 0.045 + castPulse * 0.12, 0.08 + castPulse * 0.18);
      staffTrailMesh.current.rotation.set(0.35 + castPulse * 0.28, -0.18, -0.52 + Math.sin(stride * 0.72) * 0.14 - castPulse * 0.48);
      staffTrailMesh.current.scale.set(0.12 + stage * 0.012 + castPulse * 0.05, 0.7 + moveAmount * 0.28 + dashPower * 0.24 + castPulse * 0.72, 0.12);
      staffTrailMesh.current.material.opacity = 0.38 + Math.min(0.42, castPulse * 1.45) + dashPower * 0.08;
    }
    if (shoulderSash.current) {
      shoulderSash.current.visible = moveAmount > 0.02 || focus > 0;
      shoulderSash.current.position.y = 1.05 + Math.sin(stride * 0.48) * 0.045;
      shoulderSash.current.rotation.set(0.16 + moveAmount * 0.1 + hurtPulse * 0.12, Math.sin(stride * 0.34) * 0.08, Math.sin(stride) * 0.12 * moveAmount + castPulse * 0.08);
    }
    if (castArcMesh.current) {
      castArcMesh.current.visible = castPulse > 0.018;
      castArcMesh.current.position.set(0.46, 1.06 + castPulse * 0.24, 0.24 + castPulse * 0.24);
      castArcMesh.current.rotation.set(0.18, -0.42 + castPulse * 0.42, -0.76 + castPulse * 2.05);
      castArcMesh.current.scale.setScalar(0.68 + castPulse * 1.75 + stage * 0.05);
      castArcMesh.current.material.opacity = Math.min(0.78, 0.2 + castPulse * 2.1);
    }
    if (hurtGuardMesh.current) {
      hurtGuardMesh.current.visible = hurtPulse > 0.02;
      hurtGuardMesh.current.rotation.z += 0.082;
      hurtGuardMesh.current.scale.setScalar(0.86 + hurtPulse * 1.8);
      hurtGuardMesh.current.material.opacity = Math.min(0.76, hurtPulse * 1.55);
    }
    if (hurtShardMesh.current) {
      hurtShardMesh.current.visible = hurtPulse > 0.025;
      hurtShardMesh.current.position.set(0, 1.12 + hurtPulse * 0.22, 0.06);
      hurtShardMesh.current.rotation.set(0.72 + hurtPulse * 0.38, now * 0.008, Math.PI / 4 + hurtPulse * 1.2);
      hurtShardMesh.current.scale.set(0.22 + hurtPulse * 0.38, 0.22 + hurtPulse * 0.38, 0.22 + hurtPulse * 0.38);
      hurtShardMesh.current.material.opacity = Math.min(0.72, hurtPulse * 1.3);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={bodyShell}>
        <RuneDrifterModel visualQuality={visualQuality} />
      </group>
      <mesh ref={cloakMesh} position={[0, 0.75, -0.56]} rotation={[0.25, 0, 0]} scale={[0.58, 1.0, 1]} visible={false}>
        <planeGeometry args={[1, 1.34]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={shoulderSash} position={[0, 1.05, -0.32]} rotation={[0.16, 0, 0]} scale={[0.64, 0.95, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={leftStrideMesh} visible={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={rightStrideMesh} visible={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={staffTrailMesh} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.54} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castArcMesh} visible={false}>
        <torusGeometry args={[0.62, 0.024, 8, 48, Math.PI * 1.18]} />
        <meshBasicMaterial color={runeColor} transparent opacity={0.46} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={hurtGuardMesh} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.78, 0]} visible={false}>
        <ringGeometry args={[0.62, 0.78, 40]} />
        <meshBasicMaterial color={ART_TOKENS.dangerRed} transparent opacity={0.0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={hurtShardMesh} position={[0, 1.1, 0.04]} visible={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={ART_TOKENS.dangerRed} transparent opacity={0.0} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.05, -0.18]} scale={[0.24, 0.24, 0.24]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={runeColor} emissive={runeColor} emissiveIntensity={2.4} roughness={0.18} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.03, -0.2]} rotation={[0, 0, Math.PI / 4]} scale={[0.48 + stage * 0.04, 0.48 + stage * 0.04, 1]}>
        <ringGeometry args={[0.52, 0.6, 4]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <group ref={crestGroup} position={[0, 1.55, 0]}>
        <mesh position={[0, 0.12, 0.22]} rotation={[Math.PI / 2, 0, 0]} scale={[0.92 + stage * 0.05, 0.92 + stage * 0.05, 1]}>
          <ringGeometry args={[0.42, 0.49, 48]} />
          <meshBasicMaterial color={runeColor} transparent opacity={0.36 + stage * 0.035} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
        <mesh position={[-0.46, -0.05, 0.18]} rotation={[0.3, 0.2, -0.36]} scale={[0.12, 0.5 + stage * 0.03, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.76} toneMapped={false} />
        </mesh>
        <mesh position={[0.46, -0.05, 0.18]} rotation={[0.3, -0.2, 0.36]} scale={[0.12, 0.5 + stage * 0.03, 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.76} toneMapped={false} />
        </mesh>
      </group>
      <group ref={runeGroup} position={[0, 0.84, 0]}>
        {Array.from({ length: runeCount }, (_, index) => {
          const angle = index * (Math.PI * 2 / runeCount);
          const radius = 0.82 + index * 0.015;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * radius, 0.2 + (index % 2) * 0.2, Math.sin(angle) * radius]}
              rotation={[0.8, angle, 0.4]}
              scale={[0.18, 0.34, 0.08]}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={runeColor} emissive={runeColor} emissiveIntensity={1.65} roughness={0.26} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function RuneDrifterModel({ visualQuality = 'high' }) {
  const { scene } = useGLTF(MODEL_URLS.player);
  const model = useMemo(() => cloneSkeleton(scene), [scene]);

  useEffect(() => {
    const warmLift = new THREE.Color('#f0d081');
    const shadowWood = new THREE.Color('#6f5138');
    const parchment = new THREE.Color('#d8d1b6');
    const flattenMaterials = visualQuality !== 'high';
    model.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const styledMaterials = materials.map(material => {
          if (!material) return material;
          const clone = material.clone();
          if (flattenMaterials) {
            clone.map = null;
            clone.normalMap = null;
            clone.roughnessMap = null;
            clone.metalnessMap = null;
            clone.aoMap = null;
            clone.vertexColors = false;
          }
          if (clone.color) {
            const luminance = clone.color.r * 0.2126 + clone.color.g * 0.7152 + clone.color.b * 0.0722;
            if (luminance < 0.08) {
              clone.color.copy(shadowWood);
            } else if (flattenMaterials && luminance > 0.82) {
              clone.color.copy(parchment);
            } else {
              clone.color.lerp(warmLift, flattenMaterials ? 0.11 : 0.06);
            }
          }
          if ('roughness' in clone) clone.roughness = Math.max(clone.roughness ?? 0.5, 0.48);
          if ('metalness' in clone) clone.metalness = Math.min(clone.metalness ?? 0, 0.08);
          clone.needsUpdate = true;
          return clone;
        });
        child.material = Array.isArray(child.material) ? styledMaterials : styledMaterials[0];
      }
    });
  }, [model, visualQuality]);

  return (
    <primitive
      object={model}
      position={[0, 0.02, 0]}
      rotation={[0, 0, 0]}
      scale={[PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE, PLAYER_VISUAL_BASE_SCALE]}
    />
  );
}

export function OrbitBlades({ player, game, visualQuality = 'high' }) {
  if (visualQuality === 'high') return <SourceOrbitBlades player={player} game={game} />;
  return <StylizedOrbitBlades player={player} game={game} visualQuality={visualQuality} />;
}

function SourceOrbitBlades({ player, game }) {
  const stats = game.stats;
  const parts = useInstancedModelParts(PROJECTILE_MODEL_URLS.orbitBlade);
  const meshRefs = useRef([]);
  const bladeFocus = getBuildFocus(game, 'blade');
  const bladeCount = getBladeCount(stats, bladeFocus, isWeaponFamilyUnlocked(game, 'blade'));
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4(),
    baseMatrices: Array.from({ length: MAX_ORBIT_BLADES }, () => new THREE.Matrix4())
  }), []);

  useFrame(() => {
    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = (2.5 + Math.min(0.5, stats.bladeBonus * 0.08) + bladeFocus * 0.08) * stats.bladeRadius;
    for (let index = 0; index < bladeCount; index += 1) {
      const angle = spin + index * (Math.PI * 2 / bladeCount);
      local.pos.set(
        player.current.pos.x + Math.cos(angle) * radius,
        player.current.pos.y + 0.24,
        player.current.pos.z + Math.sin(angle) * radius
      );
      local.quat.setFromAxisAngle(axis, -angle + Math.PI / 2);
      local.scale.setScalar((0.62 + stats.pierce * 0.04) * Math.min(1.45, stats.bladeDamage));
      local.base.compose(local.pos, local.quat, local.scale);
      local.baseMatrices[index].copy(local.base);
    }
    parts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      if (bladeCount <= 0) {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
        return;
      }
      for (let index = 0; index < bladeCount; index += 1) {
        local.final.multiplyMatrices(local.baseMatrices[index], part.localMatrix);
        mesh.setMatrixAt(index, local.final);
      }
      mesh.count = bladeCount;
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {parts.map((part, index) => (
        <instancedMesh
          key={`orbit-blade-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, MAX_ORBIT_BLADES]}
          frustumCulled={false}
          castShadow
        />
      ))}
    </group>
  );
}

function StylizedOrbitBlades({ player, game, visualQuality = 'balanced' }) {
  const stats = game.stats;
  const bladeFocus = getBuildFocus(game, 'blade');
  const bladeCount = getBladeCount(stats, bladeFocus, isWeaponFamilyUnlocked(game, 'blade'));
  const bladeRef = useRef();
  const glintRef = useRef();
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color()
  }), []);

  useFrame(() => {
    const blades = Math.min(MAX_ORBIT_BLADES, bladeCount);
    if (blades <= 0) {
      [bladeRef.current, glintRef.current].forEach(mesh => {
        if (!mesh) return;
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      });
      return;
    }

    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = (2.5 + Math.min(0.5, stats.bladeBonus * 0.08) + bladeFocus * 0.08) * stats.bladeRadius;
    const size = (0.78 + stats.pierce * 0.035) * Math.min(1.38, stats.bladeDamage);

    for (let index = 0; index < blades; index += 1) {
      const angle = spin + index * (Math.PI * 2 / blades);
      local.pos.set(
        player.current.pos.x + Math.cos(angle) * radius,
        player.current.pos.y + 0.24,
        player.current.pos.z + Math.sin(angle) * radius
      );
      local.quat.setFromEuler(new THREE.Euler(0.02, -angle + Math.PI / 2, index % 2 ? 0.18 : -0.18));
      local.matrix.compose(local.pos, local.quat, local.scale.set(1.05 * size, 0.1 * size, 0.22 * size));
      bladeRef.current?.setMatrixAt(index, local.matrix);
      local.color.set(index % 2 ? '#f7d06b' : '#fff09a');
      bladeRef.current?.setColorAt(index, local.color);

      local.pos.y += 0.035;
      local.matrix.compose(local.pos, local.quat, local.scale.set(0.7 * size, 0.035 * size, 0.25 * size));
      glintRef.current?.setMatrixAt(index, local.matrix);
      local.color.set(visualQuality === 'low' ? '#bdefff' : '#e7fbff');
      glintRef.current?.setColorAt(index, local.color);
    }

    [bladeRef.current, glintRef.current].forEach(mesh => {
      if (!mesh) return;
      mesh.count = blades;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      <instancedMesh ref={bladeRef} args={[null, null, MAX_ORBIT_BLADES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glintRef} args={[null, null, MAX_ORBIT_BLADES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={visualQuality === 'low' ? 0.52 : 0.68} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
