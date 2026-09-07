import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SPRITE_URLS } from '../config/assets.js';
import { ART_TOKENS } from '../config/artDirection.js';
import { MAX_ORBIT_BLADES, PLAYER_SPEED } from '../config/gameTuning.js';
import { RUNE_WARDEN_ATLAS, getRuneWardenAnimationFrame } from '../systems/playerSprite.js';
import { getBladeCount, getBladeOrbitRadius, getBladeSize, getBuildFocus, getDominantBuild, getOrbColor, getWeaponStage, isWeaponFamilyUnlocked } from '../systems/progression.js';
import { syncInstanceMeshes } from './instancedMeshUtils.js';
import { createSpriteAtlasTexture } from './spriteAtlasTexture.js';

export function PlayerAvatar({ rootRef, game, player }) {
  const bodyShell = useRef();
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
  });

  return (
    <group ref={rootRef}>
      <group ref={bodyShell}>
        <RuneWardenSprite player={player} runeColor={runeColor} />
      </group>
    </group>
  );
}

function RuneWardenSprite({ player, runeColor }) {
  const spriteRef = useRef();
  const sourceTexture = useTexture(SPRITE_URLS.runeWarden);
  const texture = useMemo(() => {
    const next = createSpriteAtlasTexture(sourceTexture);
    next.repeat.set(1 / RUNE_WARDEN_ATLAS.columns, 1 / RUNE_WARDEN_ATLAS.rows);
    next.offset.set(0, 0);
    next.needsUpdate = true;
    return next;
  }, [sourceTexture]);
  const material = useMemo(() => {
    const next = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
      toneMapped: false
    });
    next.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        float runeLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = min(vec3(1.0), diffuseColor.rgb * mix(1.0, inversesqrt(max(runeLuma, 0.02)), 0.28));
      `);
    };
    next.customProgramCacheKey = () => 'rune-warden-matted-atlas-v5';
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

    const baseSize = 5.5;
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
    <sprite ref={spriteRef} material={material} position={[0, 2.45, 0]} scale={[5.5, 5.5, 1]} renderOrder={6} />
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
