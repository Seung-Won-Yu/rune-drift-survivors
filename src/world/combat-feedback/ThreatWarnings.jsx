import { Text } from '@react-three/drei';
import * as THREE from 'three';

import { getSpawnWarningPresentation } from '../../systems/combatFeedbackPresentation.js';

export function SpawnWarning({ warning, visualQuality = 'high' }) {
  const {
    progress,
    urgency,
    isThreat,
    pulse,
    opacity,
    labelOpacity,
    cueOpacity
  } = getSpawnWarningPresentation(warning);
  const shape = warning.shape ?? 'spawn';
  const isShockwave = shape === 'shockwave';
  const isSummon = shape === 'summon';
  const isGuard = shape === 'guard';
  const isCharge = shape === 'charge';
  const radius = warning.radius ?? (pulse + progress * 1.8);
  const innerRadius = warning.radius ? Math.max(0.72, warning.radius * 0.42) : 0.75 + progress * 0.5;
  const ringSegments = isGuard ? 4 : isSummon ? 6 : visualQuality === 'low' ? 18 : 36;
  const markerSegments = isCharge ? 3 : isGuard ? 4 : 6;
  const markerCount = visualQuality === 'low' || !isThreat ? 0 : isCharge ? 3 : 4;
  const showDetail = visualQuality !== 'low';
  const outerColor = isThreat ? (urgency >= 0.58 ? '#f07b62' : '#e2ad58') : warning.color;
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
            fillOpacity={labelOpacity}
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
              fillOpacity={cueOpacity}
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
