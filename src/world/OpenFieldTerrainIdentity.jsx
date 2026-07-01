import { useMemo } from 'react';
import { SHRINE_SITES } from '../config/gameData.js';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { GroundDecalInstances, TerrainStoneInstances } from './InstancedGeometry.jsx';

export function OpenFieldTerrainIdentity({ visualQuality = 'high' }) {
  const landmarks = useMemo(() => {
    const meadowCount = visualQuality === 'low' ? 6 : visualQuality === 'balanced' ? 8 : 16;
    const ridgeCount = visualQuality === 'low' ? 7 : visualQuality === 'balanced' ? 9 : 12;
    const runeArcCount = visualQuality === 'low' ? 5 : visualQuality === 'balanced' ? 7 : 9;
    const forestShadowCount = visualQuality === 'high' ? 7 : 0;

    const groveClearings = SHRINE_SITES.map((site, index) => {
      const x = Math.cos(site.angle) * site.radius;
      const z = Math.sin(site.angle) * site.radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.04, z],
        rotation: -site.angle + Math.PI / 2,
        scale: [8.8 + (index % 2) * 1.0, 5.4 + (index % 3) * 0.55, 1],
        color: index % 2 ? '#a7cc72' : '#b8d87a',
        ring: index % 2 ? '#f0cb68' : '#bef07d'
      };
    });

    const forestShadowPatches = Array.from({ length: forestShadowCount }, (_, index) => {
      const angle = index * Math.PI * 2 / forestShadowCount + 0.32 + Math.sin(index * 1.14) * 0.1;
      const radius = 82 + (index % 4) * 7.6 + Math.cos(index * 1.48) * 2.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.036, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index * 1.9) * 0.3,
        scale: [21.5 + (index % 3) * 4.2, 7.6 + (index % 4) * 1.35, 1],
        color: index % 2 ? '#3e6738' : '#4b773e',
        opacity: visualQuality === 'low' ? 0.09 : 0.12
      };
    });

    const heroMeadows = [
      { angle: -0.34, radius: 28, sx: 18, sz: 6.2, color: '#b8d878', opacity: 0.1 },
      { angle: 1.12, radius: 34, sx: 15, sz: 5.4, color: '#dec978', opacity: 0.08 },
      { angle: 2.78, radius: 42, sx: 19, sz: 6.8, color: '#a7cf72', opacity: 0.1 },
      { angle: 4.26, radius: 36, sx: 16, sz: 5.4, color: '#d5be70', opacity: 0.075 }
    ].map((patch, index) => {
      const x = Math.cos(patch.angle) * patch.radius;
      const z = Math.sin(patch.angle) * patch.radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.039, z],
        rotation: -patch.angle + Math.PI / 2 + index * 0.08,
        scale: [patch.sx, patch.sz, 1],
        color: patch.color,
        opacity: patch.opacity
      };
    });

    const meadowPatches = Array.from({ length: meadowCount }, (_, index) => {
      const angle = index * 1.37 + (index % 4) * 0.12;
      const radius = 18 + (index % 15) * 4.7 + Math.sin(index * 1.14) * 1.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const nearCenter = Math.hypot(x, z) < 20;
      return {
        skip: nearCenter || radius > ARENA_RADIUS - 11,
        position: [x, getTerrainHeight(x, z) + 0.041, z],
        rotation: -angle + Math.PI / 2 + Math.sin(index * 1.7) * 0.34,
        scale: [6.8 + (index % 5) * 1.1, 2.5 + (index % 4) * 0.48, 1],
        color: index % 5 === 0 ? '#dfc777' : index % 3 === 0 ? '#add774' : '#94c96b',
        opacity: index % 5 === 0 ? 0.075 : 0.09
      };
    }).filter(patch => !patch.skip);

    const shrineRoads = SHRINE_SITES.map((site, index) => {
      const radius = site.radius * 0.5;
      const x = Math.cos(site.angle) * radius;
      const z = Math.sin(site.angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.044, z],
        rotation: -site.angle + Math.PI / 2,
        scale: [site.radius * 0.68, 3.4 + (index % 2) * 0.35, 1],
        color: index % 2 ? '#d5bd6f' : '#b8cf73'
      };
    });

    const ridges = Array.from({ length: ridgeCount }, (_, index) => {
      const angle = index * Math.PI * 2 / ridgeCount + (index % 2) * 0.07;
      const radius = 46 + (index % 5) * 2.65;
      return {
        position: [Math.cos(angle) * radius, getTerrainHeight(Math.cos(angle) * radius, Math.sin(angle) * radius) + 0.18, Math.sin(angle) * radius],
        rotation: -angle + Math.PI / 2,
        scale: [3.4 + (index % 3) * 0.62, 0.5 + (index % 2) * 0.1, 1.0 + (index % 4) * 0.22],
        color: index % 2 ? '#a19a70' : '#809360'
      };
    });

    const standingStones = [0.28, 1.05, 1.84, 2.64, 3.48, 4.22, 4.96, 5.62].map((angle, index) => {
      const radius = index % 2 ? 36.5 : 43.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.5, z],
        rotation: -angle + 0.2,
        scale: [1.22, 1.1 + (index % 4) * 0.12, 0.82],
        color: index % 2 ? '#aca271' : '#839b68'
      };
    });

    const wornPaths = [0.18, 1.76, 3.22, 4.78].map((angle, index) => {
      const radius = index % 2 ? 28 : 22;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.045, z],
        rotation: -angle + Math.PI / 2,
        scale: [11 + index * 0.75, 2.4 + (index % 2) * 0.35, 1],
        color: index % 2 ? '#d4b66b' : '#b9cd72'
      };
    });

    const runeArcs = Array.from({ length: runeArcCount }, (_, index) => {
      const angle = index * Math.PI * 2 / runeArcCount + 0.12;
      const radius = index % 2 ? 62 : 72;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.058, z],
        rotation: -angle + Math.PI / 2,
        scale: [8.8 + (index % 3) * 1.1, 0.46 + (index % 2) * 0.12, 1],
        color: index % 3 === 0 ? '#efc465' : index % 3 === 1 ? '#9bd970' : '#b8b767'
      };
    });

    const sigilPlates = [0.46, 1.72, 2.92, 4.1, 5.24].map((angle, index) => {
      const radius = 55 + (index % 2) * 13;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: [x, getTerrainHeight(x, z) + 0.06, z],
        rotation: -angle + Math.PI / 2,
        scale: [5.8 + index * 0.32, 1.95 + (index % 2) * 0.32, 1],
        color: index % 2 ? '#a8b86b' : '#91b866',
        rune: index % 2 ? '#bff47e' : '#f0c566'
      };
    });

    const groveRings = groveClearings.map(clearing => ({
      position: [clearing.position[0], clearing.position[1] + 0.01, clearing.position[2]],
      rotation: 0,
      scale: [1, 1, 1],
      color: clearing.ring
    }));

    const sigilRunes = sigilPlates.map(plate => ({
      position: [plate.position[0], plate.position[1] + 0.012, plate.position[2]],
      rotation: plate.rotation + Math.PI / 4,
      scale: [plate.scale[0] * 0.42, plate.scale[1] * 0.42, 1],
      color: plate.rune
    }));

    return {
      groveClearings,
      groveRings,
      forestShadowPatches,
      heroMeadows,
      meadowPatches,
      shrineRoads,
      ridges,
      standingStones,
      wornPaths,
      runeArcs,
      sigilPlates,
      sigilRunes
    };
  }, [visualQuality]);

  return (
    <group>
      {visualQuality === 'high' && <GroundDecalInstances transforms={landmarks.forestShadowPatches} shape="circle" segments={28} opacity={0.04} />}
      <GroundDecalInstances transforms={landmarks.heroMeadows} shape="circle" segments={36} opacity={visualQuality === 'high' ? 0.14 : 0.08} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.038, 0]}>
        <ringGeometry args={[13.5, 13.8, 72]} />
        <meshBasicMaterial color="#efc76c" transparent opacity={0.24} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.046, 0]}>
        <ringGeometry args={[43.0, 43.34, 96]} />
        <meshBasicMaterial color="#ebc364" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, getTerrainHeight(0, 0) + 0.05, 0]}>
        <ringGeometry args={[75.5, 76.05, 96]} />
        <meshBasicMaterial color="#a9d872" transparent opacity={0.1} depthWrite={false} toneMapped={false} />
      </mesh>

      <GroundDecalInstances transforms={landmarks.meadowPatches} shape="circle" segments={28} opacity={visualQuality === 'high' ? 0.14 : 0.07} />
      <GroundDecalInstances transforms={landmarks.shrineRoads} shape="circle" segments={36} opacity={visualQuality === 'high' ? 0.13 : 0.075} />
      <GroundDecalInstances transforms={landmarks.groveClearings} shape="circle" segments={36} opacity={visualQuality === 'high' ? 0.2 : 0.09} />
      <GroundDecalInstances transforms={landmarks.groveRings} shape="ring" ringArgs={[6.5, 6.78, 48]} opacity={visualQuality === 'high' ? 0.16 : 0.1} />
      <GroundDecalInstances transforms={landmarks.wornPaths} shape="circle" segments={32} opacity={visualQuality === 'high' ? 0.2 : 0.09} />
      <GroundDecalInstances transforms={landmarks.sigilPlates} shape="ring" ringArgs={[0.42, 0.58, 4]} opacity={visualQuality === 'high' ? 0.2 : 0.13} doubleSide />
      <GroundDecalInstances transforms={landmarks.sigilRunes} shape="ring" ringArgs={[0.36, 0.44, 4]} opacity={visualQuality === 'high' ? 0.1 : 0.07} />
      <GroundDecalInstances transforms={landmarks.runeArcs} shape="plane" opacity={visualQuality === 'high' ? 0.1 : 0.055} doubleSide />
      {visualQuality === 'high' && <TerrainStoneInstances transforms={landmarks.ridges} roll={0.04} roughness={0.96} />}
      {visualQuality === 'high' && <TerrainStoneInstances transforms={landmarks.standingStones} roll={-0.04} roughness={0.9} />}
    </group>
  );
}
