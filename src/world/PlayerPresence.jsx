import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { PLAYER_SPEED } from '../config/gameTuning.js';
import { getDominantBuild, getOrbColor, getWeaponStage } from '../systems/progression.js';

export function PlayerPresence({ player, game, visualQuality = 'high' }) {
  const root = useRef();
  const ground = useRef();
  const castHalo = useRef();
  const dashTrail = useRef();
  const dashSpark = useRef();
  const focusBeam = useRef();
  const directionRune = useRef();
  const shoulderRune = useRef();
  const leftFootRune = useRef();
  const rightFootRune = useRef();
  const castNeedle = useRef();
  const stage = getWeaponStage(game);
  const dominantBuild = getDominantBuild(game);
  const focus = dominantBuild?.focus ?? 0;
  const color = dominantBuild?.color ?? getOrbColor(game.stats, stage);
  const shoulderRuneCount = visualQuality === 'high'
    ? Math.min(8, 2 + stage + Math.floor(focus / 2))
    : Math.min(4, 2 + Math.min(stage, 1) + Math.floor(focus / 5));

  useFrame(() => {
    if (!root.current) return;
    const current = player.current;
    const speed = current.vel.length();
    const moveAmount = THREE.MathUtils.clamp(speed / (PLAYER_SPEED * 1.15), 0, 1);
    const stride = performance.now() * 0.012;
    const dashPower = current.dashTimer > 0 ? 1 : 0;
    root.current.position.copy(current.pos);
    root.current.rotation.y = Math.atan2(current.facing.x, current.facing.z);
    if (ground.current) {
      ground.current.rotation.z += 0.012 + stage * 0.003 + speed * 0.0007;
      ground.current.scale.setScalar(1 + Math.sin(performance.now() * 0.004) * 0.04 + dashPower * 0.18 + focus * 0.025);
    }
    if (castHalo.current) {
      castHalo.current.rotation.z -= 0.01 + stage * 0.004;
      castHalo.current.scale.setScalar(1 + stage * 0.08 + focus * 0.035 + Math.min(0.18, speed * 0.012));
    }
    if (dashTrail.current) {
      dashTrail.current.visible = speed > 1.5 || dashPower > 0;
      dashTrail.current.position.set(0, -0.42, -0.68 - Math.min(0.62, speed * 0.04));
      dashTrail.current.scale.set(0.58 + dashPower * 0.72, 1.1 + Math.min(1.48, speed * 0.115) + dashPower * 0.7, 1);
      dashTrail.current.material.opacity = 0.18 + moveAmount * 0.18 + dashPower * 0.28 + stage * 0.025;
    }
    if (dashSpark.current) {
      dashSpark.current.visible = dashPower > 0;
      dashSpark.current.rotation.z -= 0.12;
      dashSpark.current.scale.setScalar(0.8 + dashPower * 0.9 + Math.sin(performance.now() * 0.028) * 0.08);
    }
    if (focusBeam.current) {
      const beamPulse = 0.82 + Math.sin(performance.now() * 0.006) * 0.08 + Math.min(0.16, focus * 0.015);
      focusBeam.current.position.set(0, 0.82 + Math.sin(performance.now() * 0.004) * 0.04, 0);
      focusBeam.current.scale.set(0.28 + stage * 0.018, 1.55 * beamPulse, 0.28 + stage * 0.018);
    }
    if (directionRune.current) {
      directionRune.current.visible = moveAmount > 0.08 || dashPower > 0;
      directionRune.current.position.set(0, -0.43, 0.86 + Math.min(0.36, speed * 0.025));
      directionRune.current.scale.set(0.5 + dashPower * 0.24, 0.92 + moveAmount * 0.24 + dashPower * 0.32, 1);
      directionRune.current.rotation.z = Math.PI / 4 + Math.sin(stride) * 0.08 * moveAmount;
      directionRune.current.material.opacity = 0.22 + moveAmount * 0.2 + dashPower * 0.28;
    }
    if (leftFootRune.current && rightFootRune.current) {
      const leftPulse = Math.max(0, Math.sin(stride));
      const rightPulse = Math.max(0, Math.sin(stride + Math.PI));
      leftFootRune.current.visible = moveAmount > 0.12;
      rightFootRune.current.visible = moveAmount > 0.12;
      leftFootRune.current.position.set(-0.28, -0.49, -0.22 + leftPulse * 0.16);
      rightFootRune.current.position.set(0.28, -0.49, -0.22 + rightPulse * 0.16);
      leftFootRune.current.scale.setScalar(0.36 + leftPulse * 0.28 + dashPower * 0.28);
      rightFootRune.current.scale.setScalar(0.36 + rightPulse * 0.28 + dashPower * 0.28);
      leftFootRune.current.rotation.z += 0.035 + moveAmount * 0.04;
      rightFootRune.current.rotation.z -= 0.035 + moveAmount * 0.04;
      leftFootRune.current.material.opacity = 0.24 + leftPulse * 0.22 + dashPower * 0.22;
      rightFootRune.current.material.opacity = 0.24 + rightPulse * 0.22 + dashPower * 0.22;
    }
    if (shoulderRune.current) {
      shoulderRune.current.rotation.y += 0.022 + stage * 0.006;
      shoulderRune.current.rotation.z = Math.sin(performance.now() * 0.004) * 0.18;
    }
    if (castNeedle.current) {
      const pulse = 0.62 + Math.sin(performance.now() * 0.006 + focus) * 0.16 + stage * 0.04;
      castNeedle.current.position.set(0, 1.12 + Math.sin(performance.now() * 0.005) * 0.04, 0.42);
      castNeedle.current.scale.set(0.16 + focus * 0.01, pulse, 0.16 + focus * 0.01);
      castNeedle.current.rotation.z += 0.028 + stage * 0.004;
    }
  });

  return (
    <group ref={root}>
      <mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.47, 0]}>
        <ringGeometry args={[0.78, 0.9, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.48} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={dashTrail} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, -0.7]} scale={[0.52, 1.1, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.38 + stage * 0.04} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={dashSpark} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.4, -0.18]} scale={[1.1, 1.1, 1]} visible={false}>
        <ringGeometry args={[0.32, 0.4, 4]} />
        <meshBasicMaterial color="#9ff7ff" transparent opacity={0.68} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={directionRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.43, 0.86]} scale={[0.5, 0.92, 1]} visible={false}>
        <coneGeometry args={[0.72, 1.1, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={focusBeam} position={[0, 0.82, 0]} scale={[0.28, 1.55, 0.28]}>
        <cylinderGeometry args={[1, 0.42, 1, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={leftFootRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} visible={false}>
        <ringGeometry args={[0.24, 0.32, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={rightFootRune} rotation={[-Math.PI / 2, 0, Math.PI / 4]} visible={false}>
        <ringGeometry args={[0.24, 0.32, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.34} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, -0.45, 0]} scale={[1.25, 1.25, 1]}>
        <ringGeometry args={[0.18, 0.23, 4]} />
        <meshBasicMaterial color="#fff1a6" transparent opacity={0.34 + stage * 0.06} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castNeedle} position={[0, 1.12, 0.42]} rotation={[0.64, 0, Math.PI / 4]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={0.58} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={castHalo} position={[0, 1.58, -0.38]} rotation={[0, 0, 0]} scale={[0.62 + stage * 0.08, 0.62 + stage * 0.08, 1]}>
        <ringGeometry args={[0.52, 0.58, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.58, -0.38]} rotation={[0, 0, Math.PI / 4]} scale={[0.42 + stage * 0.05, 0.42 + stage * 0.05, 1]}>
        <ringGeometry args={[0.4, 0.45, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={shoulderRune} position={[0, 1.36, 0]}>
        {Array.from({ length: shoulderRuneCount }, (_, index) => {
          const angle = index * Math.PI * 2 / shoulderRuneCount;
          return (
            <mesh key={`player-shoulder-rune-${index}`} position={[Math.cos(angle) * 0.58, 0.08 + (index % 2) * 0.16, Math.sin(angle) * 0.58]} rotation={[0.55, angle, 0.35]} scale={[0.08, 0.22 + stage * 0.02, 0.08]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={index % 2 ? '#fff1a6' : color} transparent opacity={0.8} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {visualQuality === 'high' && <pointLight position={[0, 1.15, 0.2]} color={color} intensity={0.55 + stage * 0.2} distance={4.2} />}
    </group>
  );
}
