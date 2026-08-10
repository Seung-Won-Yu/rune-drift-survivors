import { useMemo } from 'react';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { GroundDecalInstances } from './InstancedGeometry.jsx';

export function RuinFieldBackdrop({ visualQuality = 'high' }) {
  const field = useMemo(() => {
    const patchCount = visualQuality === 'low' ? 2 : visualQuality === 'balanced' ? 4 : 13;
    const flowerCount = visualQuality === 'low' ? 12 : visualQuality === 'balanced' ? 20 : 46;
    const pathAngles = [-0.62, 0.54, 1.74, 2.78, 4.18];

    const broadPatches = Array.from({ length: patchCount }, (_, index) => {
      const angle = index * 1.51 + Math.sin(index * 0.77) * 0.16;
      const radius = 26 + (index % 7) * 10.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.022, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index) * 0.22,
        scale: visualQuality === 'high'
          ? [24 + (index % 4) * 4.8, 11 + (index % 3) * 2.2, 1]
          : [10 + (index % 4) * 2.2, 4.4 + (index % 3) * 0.7, 1],
        color: index % 5 === 0 ? '#a38b4f' : index % 3 === 0 ? '#789d58' : '#668b54'
      };
    }).filter(patch => Math.hypot(patch.position[0], patch.position[2]) < ARENA_RADIUS - 12);

    const softPaths = pathAngles.flatMap((angle, laneIndex) => (
      Array.from({ length: 5 }, (_, index) => {
        const radius = 16 + index * 18.2;
        const tangent = angle + Math.PI / 2;
        const wave = Math.sin(index * 1.2 + laneIndex) * 4.2;
        const x = Math.cos(angle) * radius + Math.cos(tangent) * wave;
        const z = Math.sin(angle) * radius + Math.sin(tangent) * wave;
        return {
          position: [x, getTerrainHeight(x, z) + 0.027, z],
          rotation: -angle + Math.PI / 2 + Math.sin(index + laneIndex) * 0.13,
          scale: visualQuality === 'high'
            ? [12.5 + index * 0.9, 4.6 + (laneIndex % 2) * 0.7, 1]
            : [8.0 + index * 0.45, 2.6 + (laneIndex % 2) * 0.35, 1],
          color: laneIndex % 2 ? '#9d8550' : '#829c58'
        };
      })
    )).filter(path => Math.hypot(path.position[0], path.position[2]) < ARENA_RADIUS - 10);

    const flowerDots = Array.from({ length: flowerCount }, (_, index) => {
      const angle = index * 2.399963 + Math.sin(index * 0.43) * 0.18;
      const radius = 24 + (index % 29) * 2.9;
      const ringOffset = Math.sin(index * 1.9) * 4.4;
      const x = Math.cos(angle) * (radius + ringOffset);
      const z = Math.sin(angle) * (radius + ringOffset * 0.75);
      return {
        position: [x, getTerrainHeight(x, z) + 0.045, z],
        rotation: angle,
        scale: [0.42 + (index % 3) * 0.08, 0.28 + (index % 2) * 0.04, 1],
        color: index % 7 === 0 ? '#c4a14c' : index % 5 === 0 ? '#b77884' : index % 3 === 0 ? '#9274ad' : '#6ea45a'
      };
    }).filter(dot => {
      const distance = Math.hypot(dot.position[0], dot.position[2]);
      return distance > 18 && distance < ARENA_RADIUS - 16;
    });

    const centralMeadow = [
      { position: [0, getTerrainHeight(0, 0) + 0.033, 0], rotation: 0, scale: visualQuality === 'high' ? [19, 19, 1] : [10.5, 10.5, 1], color: '#769356' },
      { position: [0, getTerrainHeight(0, 0) + 0.039, 0], rotation: Math.PI / 8, scale: visualQuality === 'high' ? [10.8, 10.8, 1] : [6.4, 6.4, 1], color: '#a38b4f' }
    ];

    return { broadPatches, softPaths, flowerDots, centralMeadow };
  }, [visualQuality]);

  return (
    <group>
      <GroundDecalInstances transforms={field.broadPatches} shape="circle" segments={36} opacity={visualQuality === 'high' ? 0.075 : 0.03} />
      <GroundDecalInstances transforms={field.softPaths} shape="circle" segments={28} opacity={visualQuality === 'high' ? 0.1 : 0.045} />
      <GroundDecalInstances transforms={field.centralMeadow} shape="circle" segments={48} opacity={visualQuality === 'high' ? 0.11 : 0.05} />
      <GroundDecalInstances transforms={field.flowerDots} shape="ring" ringArgs={[0.42, 0.7, 5]} opacity={visualQuality === 'high' ? 0.2 : 0.12} doubleSide />
    </group>
  );
}
