import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SPRITE_URLS } from '../config/assets.js';
import { ART_TOKENS } from '../config/gameData.js';
import { MAX_ORBIT_BLADES, PLAYER_SPEED } from '../config/gameTuning.js';
import { RUNE_WARDEN_ATLAS, getRuneWardenAnimationFrame } from '../systems/playerSprite.js';
import { getBladeCount, getBladeOrbitRadius, getBladeSize, getBuildFocus, getDominantBuild, getOrbColor, getWeaponStage, isWeaponFamilyUnlocked } from '../systems/progression.js';
import { syncInstanceMeshes } from './instancedMeshUtils.js';
import { NEUTRAL_KEY_ALPHA_TEST, applyNeutralKeyFragment } from './neutralKeyShader.js';

export function PlayerAvatar({ rootRef, game, player, visualQuality = 'high' }) {
  const leftStrideMesh = useRef();
  const rightStrideMesh = useRef();
  const staffTrailMesh = useRef();
  const bodyShell = useRef();
  const castArcMesh = useRef();
  const hurtGuardMesh = useRef();
  const hurtShardMesh = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
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
        <RuneWardenSprite
          player={player}
          visualQuality={visualQuality}
          runeColor={runeColor}
        />
      </group>
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
    </group>
  );
}

function RuneWardenSprite({ player, visualQuality = 'balanced', runeColor }) {
  const spriteRef = useRef();
  const sourceTexture = useTexture(SPRITE_URLS.runeWarden);
  const texture = useMemo(() => {
    const next = sourceTexture.clone();
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.ClampToEdgeWrapping;
    next.wrapT = THREE.ClampToEdgeWrapping;
    next.generateMipmaps = false;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    next.repeat.set(1 / RUNE_WARDEN_ATLAS.columns, 1 / RUNE_WARDEN_ATLAS.rows);
    next.offset.set(0, 0);
    next.needsUpdate = true;
    return next;
  }, [sourceTexture]);
  const material = useMemo(() => {
    const next = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: NEUTRAL_KEY_ALPHA_TEST,
      depthWrite: false,
      toneMapped: false
    });
    next.onBeforeCompile = shader => {
      applyNeutralKeyFragment(shader);
    };
    next.customProgramCacheKey = () => 'rune-warden-clean-edge-v2';
    return next;
  }, [texture]);
  const colors = useMemo(() => ({
    base: new THREE.Color('#ffffff'),
    cast: new THREE.Color(runeColor),
    hurt: new THREE.Color(ART_TOKENS.dangerRed)
  }), [runeColor]);

  useEffect(() => () => {
    material.dispose();
    texture.dispose();
  }, [material, texture]);

  useFrame(() => {
    if (!spriteRef.current) return;
    const current = player.current;
    const now = performance.now();
    const speed = current.vel?.length?.() ?? 0;
    const dashPower = current.dashTimer > 0 ? 1 : 0;
    const castPulse = current.castPulse ?? 0;
    const hurtPulse = current.hurtPulse ?? 0;
    const frame = getRuneWardenAnimationFrame({
      facing: current.facing,
      timeMs: now,
      speed,
      dashTimer: current.dashTimer,
      castPulse,
      hurtPulse
    });
    texture.offset.set(frame.offsetX, frame.offsetY);

    const baseSize = visualQuality === 'low' ? 4.05 : 4.35;
    spriteRef.current.scale.set(
      baseSize * (1 + dashPower * 0.16 + castPulse * 0.07),
      baseSize * (1 - dashPower * 0.06 + castPulse * 0.11 - hurtPulse * 0.05),
      1
    );
    material.color
      .copy(colors.base)
      .lerp(colors.cast, castPulse * 0.16)
      .lerp(colors.hurt, hurtPulse * 0.42);
    material.opacity = 0.98 - hurtPulse * 0.08;
  });

  return (
    <sprite ref={spriteRef} material={material} position={[0, 2.06, 0]} scale={[4.35, 4.35, 1]} renderOrder={6} />
  );
}

export function OrbitBlades({ player, game, visualQuality = 'high' }) {
  return <StylizedOrbitBlades player={player} game={game} visualQuality={visualQuality} />;
}

function StylizedOrbitBlades({ player, game, visualQuality = 'balanced' }) {
  const stats = game.stats;
  const stage = getWeaponStage(game);
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
      syncInstanceMeshes([bladeRef.current, glintRef.current], 0);
      return;
    }

    const spin = performance.now() * (0.0022 + Math.min(0.001, (1 - stats.cooldown) * 0.0018));
    const radius = getBladeOrbitRadius(stats, stage, bladeFocus);
    const size = getBladeSize(stats);

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
      local.color.set(index % 2 ? '#d4a84c' : '#d8bd64');
      bladeRef.current?.setColorAt(index, local.color);

      local.pos.y += 0.035;
      local.matrix.compose(local.pos, local.quat, local.scale.set(0.7 * size, 0.035 * size, 0.25 * size));
      glintRef.current?.setMatrixAt(index, local.matrix);
      local.color.set(visualQuality === 'low' ? '#bdefff' : '#e7fbff');
      glintRef.current?.setColorAt(index, local.color);
    }

    syncInstanceMeshes([bladeRef.current, glintRef.current], blades);
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
