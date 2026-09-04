import { Text } from '@react-three/drei';

import { getHitBurstPresentation } from '../../systems/combatFeedbackPresentation.js';

export function HitBurst({ burst, visualQuality = 'high' }) {
  const progress = 1 - burst.life / burst.maxLife;
  const radius = Math.max(0.55, burst.radius ?? 1);
  const profile = getHitBurstPresentation(burst.type);
  const shardOpacity = Math.max(0, 0.68 - progress * 0.68);
  const ringSegments = profile.ringSegments ?? (visualQuality === 'low' ? 14 : 24);
  const qualityShards = visualQuality === 'high' ? 4 : visualQuality === 'balanced' ? 2 : 0;
  const shardCount = visualQuality === 'low'
    ? Math.min(2, profile.shardBonus)
    : Math.min(10, Math.round(qualityShards * profile.shardQualityScale) + profile.shardBonus);
  const showCore = visualQuality !== 'low' && profile.showCore !== false;
  const ringScale = radius * (0.7 + progress * profile.ringExpansion);
  const [ringInner, ringOuter] = profile.ringThickness;
  return (
    <group position={[burst.pos.x, burst.pos.y + 0.18, burst.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, profile.ringRotation]} scale={[ringScale, ringScale, 1]}>
        {profile.fillDisc
          ? <circleGeometry args={[ringOuter, ringSegments]} />
          : <ringGeometry args={[ringInner, ringOuter, ringSegments]} />}
        <meshBasicMaterial
          color={burst.color}
          transparent
          opacity={profile.fillDisc ? Math.max(0, 0.16 - progress * 0.16) : Math.max(0, 0.72 - progress * 0.72)}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {profile.showEcho && (
        <mesh
          rotation={[-Math.PI / 2, 0, Math.PI / ringSegments]}
          scale={[ringScale * (0.58 + progress * 0.34), ringScale * (0.58 + progress * 0.34), 1]}
        >
          <ringGeometry args={[0.46, 0.51, ringSegments]} />
          <meshBasicMaterial color={profile.highlightColor} transparent opacity={Math.max(0, 0.3 - progress * 0.28)} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {showCore && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4 + profile.ringRotation]} scale={[radius * (0.46 + progress * 1.9), radius * (0.46 + progress * 1.9), 1]}>
            <ringGeometry args={[0.12, 0.16, 4]} />
            <meshBasicMaterial color={profile.highlightColor} transparent opacity={Math.max(0, 0.48 - progress * 0.48)} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh
            position={[0, 0.14 + progress * 0.35, 0]}
            rotation={profile.coreShape === 'diamond' ? [0, progress * Math.PI * 2, Math.PI / 4] : [0, 0, 0]}
            scale={[
              (0.34 - progress * 0.12) * profile.coreScale,
              (0.34 - progress * 0.12) * profile.coreScale,
              (0.34 - progress * 0.12) * profile.coreScale
            ]}
          >
            {profile.coreShape === 'diamond' && <boxGeometry args={[1, 1, 1]} />}
            {profile.coreShape === 'sphere' && <sphereGeometry args={[1, 10, 8]} />}
            {profile.coreShape === 'octahedron' && <octahedronGeometry args={[1, 0]} />}
            <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.72 - progress)} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      {Array.from({ length: shardCount }, (_, index) => {
        const angle = index * Math.PI * 2 / Math.max(1, shardCount) + progress * 1.8;
        const distance = radius * (0.36 + progress * profile.shardDistance);
        return (
          <mesh
            key={`hit-shard-${index}`}
            position={[Math.cos(angle) * distance, 0.18 + progress * 0.42, Math.sin(angle) * distance]}
            rotation={profile.shardShape === 'slash'
              ? [0.18, -angle, Math.PI / 4 + progress * Math.PI * 0.5]
              : [0.68, -angle, Math.PI / 4 + progress * Math.PI]}
            scale={[
              (0.1 + radius * 0.035) * profile.shardWidth,
              (0.24 + radius * 0.055) * profile.shardLength,
              (0.1 + radius * 0.035) * profile.shardWidth
            ]}
          >
            {profile.shardShape === 'slash'
              ? <boxGeometry args={[1, 1, 1]} />
              : <coneGeometry args={[1, 1, 3]} />}
            <meshBasicMaterial color={index % 2 ? profile.highlightColor : burst.color} transparent opacity={shardOpacity} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export function DamageNumber({ number }) {
  const progress = 1 - number.life / number.maxLife;
  const opacity = Math.max(0, 1 - progress);
  return (
    <Text
      position={[number.pos.x, number.pos.y + progress * 0.45, number.pos.z]}
      rotation={[-0.86, 0, 0]}
      fontSize={number.size}
      anchorX="center"
      anchorY="middle"
      color={number.color}
      fillOpacity={opacity}
      outlineWidth={0.025}
      outlineColor="#07100f"
    >
      {number.value}
    </Text>
  );
}
