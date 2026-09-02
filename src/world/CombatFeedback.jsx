import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { getHitBurstPresentation } from '../systems/combatFeedbackPresentation.js';

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

export function SpawnWarning({ warning, visualQuality = 'high' }) {
  const progress = 1 - warning.life / warning.maxLife;
  const pulse = 1 + Math.sin(progress * Math.PI * 8) * 0.08;
  const signal = warning.signal ?? 'threat';
  const isReward = signal === 'reward';
  const isObjective = signal === 'objective';
  const isThreat = !isReward && !isObjective;
  const shape = warning.shape ?? 'spawn';
  const isShockwave = shape === 'shockwave';
  const isSummon = shape === 'summon';
  const isGuard = shape === 'guard';
  const isCharge = shape === 'charge';
  const opacity = Math.max(0, (isShockwave ? 0.78 : 0.68) - progress * 0.52);
  const radius = warning.radius ?? (pulse + progress * 1.8);
  const innerRadius = warning.radius ? Math.max(0.72, warning.radius * 0.42) : 0.75 + progress * 0.5;
  const ringSegments = isGuard ? 4 : isSummon ? 6 : visualQuality === 'low' ? 18 : 36;
  const markerSegments = isCharge ? 3 : isGuard ? 4 : 6;
  const markerCount = visualQuality === 'low' || !isThreat ? 0 : isCharge ? 3 : 4;
  const showDetail = visualQuality !== 'low';
  const outerColor = isThreat ? '#f07b62' : warning.color;
  return (
    <group position={[warning.pos.x, 0.1, warning.pos.z]}>
      {isThreat && isShockwave && showDetail && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * 0.74, radius * 0.74, 1]}>
            <ringGeometry args={[0.94, 1.0, 72]} />
            <meshBasicMaterial color="#ffd1b8" transparent opacity={opacity * 0.12} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI * 0.35]} scale={[radius * 0.48, radius * 0.48, 1]}>
            <ringGeometry args={[0.82, 1.0, 6]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
      {isThreat ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius, radius, 1]}>
            <ringGeometry args={[0.9, 1, ringSegments]} />
            <meshBasicMaterial color={outerColor} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, isGuard ? Math.PI / 4 : Math.PI / 6]} scale={[innerRadius, innerRadius, 1]}>
            <ringGeometry args={[0.68, 0.78, markerSegments, 1, 0, Math.PI * 1.5]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.62} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[radius * 0.72, radius * 0.72, 1]}>
            <ringGeometry args={[0.7, 1, 4]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.68} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[radius * 0.34, radius * 0.34, 1]}>
            <circleGeometry args={[1, 4]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.14} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      {(isSummon || isGuard || isCharge) && markerCount > 0 && Array.from({ length: markerCount }, (_, index) => {
        const angle = index * Math.PI * 2 / markerCount + progress * Math.PI * (isGuard ? -0.7 : 0.5);
        const markerRadius = radius * (isCharge ? 0.68 : 0.52);
        return (
          <mesh
            key={`warning-marker-${index}`}
            position={[Math.cos(angle) * markerRadius, 0.22, Math.sin(angle) * markerRadius]}
            rotation={[0.55, -angle, 0.2]}
            scale={[0.16, isCharge ? 0.58 : 0.38, 0.16]}
          >
            <coneGeometry args={[1, 1, isCharge ? 3 : 4]} />
            <meshBasicMaterial color={outerColor} transparent opacity={opacity * 0.7} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {showDetail && warning.label && (
        <mesh position={[0, 0.3 + progress * 0.25, 0]} rotation={[0.5, progress * Math.PI * 2, 0.2]} scale={[0.14, 0.24, 0.14]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.68 - progress * 0.5)} toneMapped={false} />
        </mesh>
      )}
      {warning.label && (
        <>
          <Text
            position={[0, 1.25 + progress * 0.4, 0]}
            rotation={[-0.86, 0, 0]}
            fontSize={0.55}
            anchorX="center"
            anchorY="middle"
            color={isThreat ? '#ffb18d' : warning.color}
            fillOpacity={Math.max(0, 1 - progress)}
            outlineWidth={0.025}
            outlineColor="#07100f"
          >
            {warning.label}
          </Text>
          {warning.cue && showDetail && (
            <Text
              position={[0, 0.82 + progress * 0.28, 0]}
              rotation={[-0.86, 0, 0]}
              fontSize={0.3}
              anchorX="center"
              anchorY="middle"
              color="#f8fffc"
              fillOpacity={Math.max(0, 0.9 - progress * 0.45)}
              outlineWidth={0.018}
              outlineColor="#07100f"
            >
              {warning.cue}
            </Text>
          )}
        </>
      )}
    </group>
  );
}
