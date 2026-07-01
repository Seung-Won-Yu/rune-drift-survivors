import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getVisualTerrainHeight, smoothStep } from '../systems/terrain.js';

export function SculptedRuinTerrain({ visualQuality = 'high' }) {
  const geometry = useMemo(() => {
    const size = ARENA_RADIUS * 2 + 48;
    const segments = visualQuality === 'low' ? 40 : visualQuality === 'balanced' ? 56 : 76;
    const half = size / 2;
    const positions = [];
    const colors = [];
    const indices = [];
    const lowColor = new THREE.Color('#516f43');
    const midColor = new THREE.Color('#7f9d5e');
    const highColor = new THREE.Color('#a09d60');
    const mossColor = new THREE.Color('#70af5c');
    const edgeColor = new THREE.Color('#233c28');
    const warmStone = new THREE.Color('#969073');
    const lowlandMud = new THREE.Color('#666f49');
    const riftBlue = new THREE.Color('#5fb994');
    const dryGrass = new THREE.Color('#9d8d55');
    const pathDust = new THREE.Color('#9d7651');
    const runeWash = new THREE.Color('#79bf87');
    const forestShade = new THREE.Color('#315834');

    for (let zIndex = 0; zIndex <= segments; zIndex += 1) {
      for (let xIndex = 0; xIndex <= segments; xIndex += 1) {
        const x = -half + (xIndex / segments) * size;
        const z = -half + (zIndex / segments) * size;
        const radius = Math.hypot(x, z);
        const y = getVisualTerrainHeight(x, z) - 0.035;
        const angle = Math.atan2(z, x);
        const heightBlend = THREE.MathUtils.clamp((y + 0.18) / 1.45, 0, 1);
        const edgeBlend = smoothStep(ARENA_RADIUS - 2.5, ARENA_RADIUS + 13.0, radius);
        const mossBlend = 0.25 + 0.25 * Math.sin(x * 0.47 + z * 0.18) * Math.cos(z * 0.39);
        const ruinWear = smoothStep(0.78, 1.45, Math.abs(Math.sin(x * 0.18) + Math.cos(z * 0.24)));
        const basinBlend = 1 - smoothStep(0.0, 17.5, radius);
        const ridgeBlend = smoothStep(36.0, 52.0, radius) * (1 - smoothStep(60.0, 74.0, radius));
        const riftBlend = smoothStep(0.84, 1.18, Math.abs(Math.sin(angle * 3 + radius * 0.12))) * smoothStep(9.0, 18.0, radius) * (1 - smoothStep(32.0, 39.0, radius));
        const dryBlend = smoothStep(0.2, 1.0, Math.sin(angle * 2.0 - 0.8) * 0.5 + 0.5) * smoothStep(20.0, 42.0, radius);
        const spokeWear = smoothStep(0.88, 0.995, Math.abs(Math.cos(angle * 4 - 0.34))) * smoothStep(14.0, 28.0, radius) * (1 - smoothStep(92.0, 112.0, radius));
        const innerRuneRing = (1 - smoothStep(0.0, 2.2, Math.abs(radius - 42.0))) * 0.9;
        const outerRuinRing = (1 - smoothStep(0.0, 3.6, Math.abs(radius - 76.0))) * 0.55;
        const laneWash = smoothStep(0.78, 1.0, Math.abs(Math.sin(angle * 2.0 + 0.4))) * smoothStep(34.0, 52.0, radius) * (1 - smoothStep(88.0, 104.0, radius));

        const color = new THREE.Color().copy(lowColor).lerp(midColor, 0.72 + mossBlend * 0.35);
        color.lerp(lowlandMud, basinBlend * 0.26);
        color.lerp(highColor, heightBlend * 0.62);
        color.lerp(mossColor, THREE.MathUtils.clamp(mossBlend, 0, 0.34));
        color.lerp(dryGrass, dryBlend * 0.24);
        color.lerp(pathDust, spokeWear * 0.36);
        color.lerp(warmStone, Math.max(ruinWear * 0.045, ridgeBlend * 0.24, outerRuinRing * 0.24));
        color.lerp(runeWash, Math.max(riftBlend * 0.2, innerRuneRing * 0.22, laneWash * 0.12));
        color.lerp(riftBlue, riftBlend * 0.12);
        color.lerp(forestShade, smoothStep(78.0, 112.0, radius) * 0.16);
        color.lerp(edgeColor, edgeBlend);

        positions.push(x, y, z);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let zIndex = 0; zIndex < segments; zIndex += 1) {
      for (let xIndex = 0; xIndex < segments; xIndex += 1) {
        const a = zIndex * (segments + 1) + xIndex;
        const b = a + 1;
        const c = a + segments + 1;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setIndex(indices);
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeometry.computeVertexNormals();
    return terrainGeometry;
  }, [visualQuality]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh receiveShadow geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.99} metalness={0.01} emissive="#4c6f3d" emissiveIntensity={0.06} />
    </mesh>
  );
}
