import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { SHRINE_VISUALS } from '../config/artDirection.js';
import { SHRINE_SITES } from '../config/gameData.js';
import {
  createRuneCircuitPathMarkLayout,
  getRuneCircuitPathPoint
} from '../systems/mapLayout.js';
import { getVisualTerrainHeight } from '../systems/terrain.js';
import { GroundDecalInstances } from './InstancedGeometry.jsx';

function getPathPoint(site, siteIndex, progress) {
  return new THREE.Vector2(...getRuneCircuitPathPoint(site, siteIndex, progress));
}

function hash2d(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7 + 19.4) * 43758.5453;
  return value - Math.floor(value);
}

function createPathWearMap() {
  const width = 64;
  const height = 192;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const edgeNoise = Math.sin(v * 71) * 0.055 + Math.sin(v * 149 + 0.7) * 0.025;
    for (let x = 0; x < width; x += 1) {
      const u = Math.abs((x + 0.5) / width * 2 - 1);
      const edgeFade = 1 - THREE.MathUtils.smoothstep(u, 0.72 + edgeNoise, 0.98 + edgeNoise);
      const chip = hash2d(x, y);
      const scuff = hash2d(Math.floor(x / 3), Math.floor(y / 5));
      const wear = chip > 0.965 ? 0.18 : scuff > 0.9 ? 0.58 : 1;
      const offset = (y * width + x) * 4;
      const value = Math.round(255 * edgeFade * wear);
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function createPathRibbon(site, siteIndex, width, segments, yOffset) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const center = getPathPoint(site, siteIndex, progress);
    const previous = getPathPoint(site, siteIndex, Math.max(0, progress - 1 / segments));
    const next = getPathPoint(site, siteIndex, Math.min(1, progress + 1 / segments));
    const direction = next.clone().sub(previous).normalize();
    const normal = new THREE.Vector2(-direction.y, direction.x);
    const edge = width * (0.92 + Math.sin(progress * Math.PI) * 0.08);

    for (const side of [-1, 1]) {
      const x = center.x + normal.x * edge * side;
      const z = center.y + normal.y * edge * side;
      positions.push(x, getVisualTerrainHeight(x, z) + yOffset, z);
      uvs.push(side < 0 ? 0 : 1, progress);
    }

    if (index < segments) {
      const offset = index * 2;
      indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function RuneCircuitPaths({ visualQuality = 'balanced' }) {
  const wearMap = useMemo(() => createPathWearMap(), []);
  const runeMarks = useMemo(
    () => createRuneCircuitPathMarkLayout(visualQuality),
    [visualQuality]
  );
  const paths = useMemo(() => SHRINE_SITES.map((site, index) => ({
    id: site.id,
    color: SHRINE_VISUALS[site.id].path,
    shoulder: createPathRibbon(site, index, 2.25, visualQuality === 'low' ? 10 : 22, 0.048),
    core: createPathRibbon(site, index, 1.5, visualQuality === 'low' ? 10 : 22, 0.062)
  })), [visualQuality]);

  useEffect(() => () => {
    paths.forEach(path => {
      path.shoulder.dispose();
      path.core.dispose();
    });
  }, [paths]);
  useEffect(() => () => wearMap.dispose(), [wearMap]);

  return (
    <group>
      {paths.map(path => (
        <group key={path.id}>
          <mesh geometry={path.shoulder} receiveShadow>
            <meshBasicMaterial color="#182b25" transparent opacity={0.58} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh geometry={path.core} receiveShadow>
            <meshStandardMaterial
              color={path.color}
              emissive={path.color}
              emissiveIntensity={0.045}
              alphaMap={wearMap}
              transparent
              opacity={visualQuality === 'low' ? 0.48 : 0.64}
              roughness={0.98}
              metalness={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
      <GroundDecalInstances
        transforms={runeMarks}
        shape="ring"
        ringArgs={[0.48, 0.68, 4]}
        opacity={visualQuality === 'low' ? 0.16 : 0.28}
        doubleSide
      />
    </group>
  );
}
