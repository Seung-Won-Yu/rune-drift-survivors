import { useMemo } from 'react';

import { ART_TOKENS } from '../config/artDirection.js';
import { getVisualTerrainHeight } from '../systems/terrain.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';

export function RuneHeartPlaza({ visualQuality = 'balanced' }) {
  const layout = useMemo(() => {
    const groundY = getVisualTerrainHeight(0, 0);
    const anchors = Array.from({ length: 4 }, (_, index) => {
      const angle = index * Math.PI / 2 + Math.PI / 4;
      return {
        position: [Math.cos(angle) * 8.05, groundY + 0.23, Math.sin(angle) * 8.05],
        rotation: [0.04, -angle, index % 2 ? 0.035 : -0.035],
        scale: [1.6, 0.34, 0.72],
        color: index % 2 ? '#53615a' : '#665f4c'
      };
    });
    const anchorRunes = anchors.map((anchor, index) => ({
      position: [anchor.position[0], groundY + 0.68, anchor.position[2]],
      rotation: [0.18, index * Math.PI / 2, 0.14],
      scale: [0.24, 0.44, 0.24],
      color: index % 2 ? ART_TOKENS.runeCyan : ART_TOKENS.wornGold
    }));
    const innerMarks = Array.from({ length: visualQuality === 'low' ? 4 : 8 }, (_, index) => {
      const angle = index * Math.PI * 2 / (visualQuality === 'low' ? 4 : 8) + Math.PI / 8;
      const radius = index % 2 ? 5.25 : 5.75;
      return {
        position: [Math.cos(angle) * radius, groundY + 0.108, Math.sin(angle) * radius],
        rotation: angle + Math.PI / 4,
        scale: [0.46, 0.46, 1],
        color: index % 2 ? ART_TOKENS.runeCyan : ART_TOKENS.wornGold
      };
    });
    return { groundY, anchors, anchorRunes, innerMarks };
  }, [visualQuality]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, layout.groundY + 0.098, 0]}>
        <ringGeometry args={[7.15, 7.42, visualQuality === 'low' ? 32 : 64]} />
        <meshBasicMaterial color={ART_TOKENS.wornGold} transparent opacity={0.2} depthWrite={false} toneMapped={false} />
      </mesh>
      <RelicBoxInstances transforms={layout.anchors} roughness={0.96} />
      <RelicOctahedronInstances transforms={layout.anchorRunes} opacity={visualQuality === 'low' ? 0.46 : 0.64} />
      <GroundDecalInstances
        transforms={layout.innerMarks}
        shape="ring"
        ringArgs={[0.5, 0.76, 4]}
        opacity={visualQuality === 'low' ? 0.16 : 0.26}
        doubleSide
      />
      {visualQuality === 'high' && (
        <pointLight position={[0, layout.groundY + 1.2, 0]} color={ART_TOKENS.runeCyan} intensity={0.22} distance={13} />
      )}
    </group>
  );
}
