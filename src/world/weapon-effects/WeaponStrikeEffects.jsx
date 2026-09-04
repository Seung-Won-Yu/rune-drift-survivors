import * as THREE from 'three';

import { getVisualBudget } from '../../hooks/useVisualQuality.js';

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
