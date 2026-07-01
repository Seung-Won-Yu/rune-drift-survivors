import { Text } from '@react-three/drei';
import * as THREE from 'three';

export function HitBurst({ burst, visualQuality = 'high' }) {
  const progress = 1 - burst.life / burst.maxLife;
  const radius = Math.max(0.55, burst.radius ?? 1);
  const shardOpacity = Math.max(0, 0.68 - progress * 0.68);
  const ringSegments = visualQuality === 'low' ? 14 : 24;
  const shardCount = visualQuality === 'high' ? 4 : visualQuality === 'balanced' ? 2 : 0;
  const showCore = visualQuality !== 'low';
  return (
    <group position={[burst.pos.x, burst.pos.y + 0.18, burst.pos.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * (0.7 + progress * 1.7), radius * (0.7 + progress * 1.7), 1]}>
        <ringGeometry args={[0.32, 0.38, ringSegments]} />
        <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.8 - progress)} depthWrite={false} toneMapped={false} />
      </mesh>
      {showCore && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} scale={[radius * (0.46 + progress * 1.9), radius * (0.46 + progress * 1.9), 1]}>
            <ringGeometry args={[0.12, 0.16, 4]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 0.58 - progress * 0.58)} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.14 + progress * 0.35, 0]} scale={[0.34 - progress * 0.12, 0.34 - progress * 0.12, 0.34 - progress * 0.12]}>
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={burst.color} transparent opacity={Math.max(0, 0.72 - progress)} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
      {Array.from({ length: shardCount }, (_, index) => {
        const angle = index * Math.PI * 2 / Math.max(1, shardCount) + progress * 1.8;
        const distance = radius * (0.36 + progress * 0.88);
        return (
          <mesh
            key={`hit-shard-${index}`}
            position={[Math.cos(angle) * distance, 0.18 + progress * 0.42, Math.sin(angle) * distance]}
            rotation={[0.68, -angle, Math.PI / 4 + progress * Math.PI]}
            scale={[0.1 + radius * 0.035, 0.24 + radius * 0.055, 0.1 + radius * 0.035]}
          >
            <coneGeometry args={[1, 1, 3]} />
            <meshBasicMaterial color={index % 2 ? '#ffffff' : burst.color} transparent opacity={shardOpacity} depthWrite={false} toneMapped={false} />
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
  const shape = warning.shape ?? 'spawn';
  const isShockwave = shape === 'shockwave';
  const isSummon = shape === 'summon';
  const isGuard = shape === 'guard';
  const isCharge = shape === 'charge';
  const opacity = Math.max(0, (isShockwave ? 0.86 : 0.75) - progress * 0.55);
  const radius = warning.radius ?? (pulse + progress * 1.8);
  const innerRadius = warning.radius ? Math.max(0.72, warning.radius * 0.42) : 0.75 + progress * 0.5;
  const towerScale = warning.radius ? Math.min(2.4, 0.8 + warning.radius * 0.045) : 0.22 + progress * 0.2;
  const ringSegments = isGuard ? 4 : isSummon ? 6 : visualQuality === 'low' ? 18 : 36;
  const markerSegments = isCharge ? 3 : isGuard ? 4 : 6;
  const markerCount = visualQuality === 'low' ? 0 : isCharge ? 3 : 4;
  const showDetail = visualQuality !== 'low';
  return (
    <group position={[warning.pos.x, 0.1, warning.pos.z]}>
      {showDetail && (
        <mesh position={[0, 0.85, 0]} scale={[towerScale, 1.6 - progress * 0.55, towerScale]}>
          <cylinderGeometry args={[1, 1, 1, 16, 1, true]} />
          <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.24 - progress * 0.08)} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {isShockwave && showDetail && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius * 0.74, radius * 0.74, 1]}>
            <ringGeometry args={[0.94, 1.0, 72]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.18} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, progress * Math.PI * 0.35]} scale={[radius * 0.48, radius * 0.48, 1]}>
            <ringGeometry args={[0.82, 1.0, 6]} />
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.18} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[radius, radius, 1]}>
        <ringGeometry args={[0.62, 0.72, ringSegments]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, isGuard ? Math.PI / 4 : Math.PI / 6]} scale={[innerRadius, innerRadius, 1]}>
        <ringGeometry args={[0.2, 0.24, markerSegments]} />
        <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.8} depthWrite={false} toneMapped={false} />
      </mesh>
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
            <meshBasicMaterial color={warning.color} transparent opacity={opacity * 0.75} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {showDetail && (
        <mesh position={[0, 0.36 + progress * 0.35, 0]} rotation={[0.5, progress * Math.PI * 3, 0.2]} scale={[0.18, 0.32, 0.18]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={warning.color} transparent opacity={Math.max(0, 0.8 - progress * 0.5)} toneMapped={false} />
        </mesh>
      )}
      {visualQuality === 'high' && <pointLight position={[0, 0.85, 0]} color={warning.color} intensity={0.65} distance={4.5} />}
      {warning.label && (
        <>
          <Text
            position={[0, 1.25 + progress * 0.4, 0]}
            rotation={[-0.86, 0, 0]}
            fontSize={0.55}
            anchorX="center"
            anchorY="middle"
            color={warning.color}
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
