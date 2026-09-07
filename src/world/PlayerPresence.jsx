import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ART_TOKENS } from '../config/artDirection.js';
import { PLAYER_SPEED } from '../config/gameTuning.js';
import { getDominantBuild, getOrbColor, getWeaponStage } from '../systems/progression.js';
import { getCombatEffectTextures } from './combatEffectTextures.js';

// A stable ground marker identifies the player. Build-colored decoration only
// appears on a cast or dash, leaving the hood, cloak, and staff unobstructed.
export function PlayerPresence({ player, game, visualQuality = 'high' }) {
  const root = useRef();
  const ground = useRef();
  const castHalo = useRef();
  const dashTrail = useRef();
  const dashSpark = useRef();
  const directionRune = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const color = dominantBuild?.color ?? getOrbColor(game.stats, stage);
  const trailTexture = useMemo(() => getCombatEffectTextures().motionTrail, []);

  useFrame(() => {
    if (!root.current) return;
    const current = player.current;
    const speed = current.vel.length();
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.15), 0, 1);
    const dashPower = current.dashTimer > 0 ? 1 : 0;
    const castPulse = current.castPulse ?? 0;
    const hurtPulse = current.hurtPulse ?? 0;
    root.current.position.copy(current.pos);
    root.current.rotation.y = Math.atan2(current.facing.x, current.facing.z);
    if (ground.current) {
      ground.current.scale.setScalar(1 + dashPower * 0.12);
      ground.current.material.color.set(hurtPulse > 0.02 ? ART_TOKENS.dangerRed : ART_TOKENS.runeCyan);
    }
    if (castHalo.current) {
      castHalo.current.visible = castPulse > 0.025;
      castHalo.current.scale.setScalar(1.1 + castPulse * 1.4);
      castHalo.current.material.opacity = Math.min(0.55, castPulse * 1.1);
    }
    if (dashTrail.current) {
      dashTrail.current.visible = dashPower > 0 || moveAmount > 0.3;
      dashTrail.current.position.set(0, -0.42, -1.1 - dashPower * 0.7);
      dashTrail.current.scale.set(0.55 + dashPower * 0.6, 1.2 + dashPower * 2.5, 1);
      dashTrail.current.material.opacity = dashPower > 0 ? 0.65 : moveAmount * 0.14;
    }
    if (dashSpark.current) {
      dashSpark.current.visible = dashPower > 0;
      dashSpark.current.scale.setScalar(1.15);
    }
    if (directionRune.current) {
      directionRune.current.visible = moveAmount > 0.08 || dashPower > 0;
      directionRune.current.position.z = 1.42 + dashPower * 0.3;
      directionRune.current.material.opacity = 0.65 + dashPower * 0.2;
    }
  });

  return (
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]} scale={[1.24, 0.85, 1]} renderOrder={1}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial color="#06100e" transparent opacity={0.38} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.46, 0]} renderOrder={2}>
        <ringGeometry args={[1.06, 1.14, 40]} />
        <meshBasicMaterial color={ART_TOKENS.runeCyan} transparent opacity={0.72} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={directionRune} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, -0.43, 1.42]} scale={[0.26, 0.2, 1]} visible={false} renderOrder={2}>
        <circleGeometry args={[1, 3]} />
        <meshBasicMaterial color="#d8f3e8" transparent opacity={0.7} depthTest={false} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={dashTrail} rotation={[-Math.PI / 2, 0, 0]} visible={false} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={trailTexture} color={color} transparent opacity={0.4} depthTest={false} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={dashSpark} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.4, -0.18]} visible={false} renderOrder={2}>
        <ringGeometry args={[0.9, 1, 4]} />
        <meshBasicMaterial color="#d8f3e8" transparent opacity={0.6} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castHalo} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.4, 0]} visible={false} renderOrder={2}>
        <ringGeometry args={[0.9, 0.96, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.0} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {visualQuality === 'high' && <pointLight position={[0, 1.15, 0.2]} color={color} intensity={0.4 + stage * 0.1} distance={4.2} />}
    </group>
  );
}
