import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { syncInstanceMesh } from './instancedMeshUtils.js';

function useInstanceScratch() {
  return useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);
}

function copyPosition(target, position) {
  if (Array.isArray(position)) {
    target.fromArray(position);
    return;
  }
  target.copy(position);
}

function copyScale(target, scale) {
  if (Array.isArray(scale)) {
    target.set(scale[0], scale[1], scale[2] ?? 1);
    return;
  }
  target.setScalar(scale ?? 1);
}

function createRadialAlphaMap() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size * 2 - 1;
      const v = (y + 0.5) / size * 2 - 1;
      const distance = Math.hypot(u, v);
      const fade = 1 - THREE.MathUtils.smoothstep(distance, 0.46, 1);
      const offset = (y * size + x) * 4;
      const value = Math.round(fade * 255);
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function RelicBoxInstances({ transforms, roughness = 0.94 }) {
  const meshRef = useRef();
  const local = useInstanceScratch();

  useEffect(() => {
    if (!meshRef.current) return;
    transforms.forEach((mark, index) => {
      copyPosition(local.pos, mark.position);
      local.quat.setFromEuler(new THREE.Euler(mark.rotation[0], mark.rotation[1], mark.rotation[2]));
      copyScale(local.scale, mark.scale);
      local.matrix.compose(local.pos, local.quat, local.scale);
      meshRef.current.setMatrixAt(index, local.matrix);
      local.color.set(mark.color);
      meshRef.current.setColorAt(index, local.color);
    });
    syncInstanceMesh(meshRef.current, transforms.length);
  }, [local, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" roughness={roughness} metalness={0.01} />
    </instancedMesh>
  );
}

export function RelicOctahedronInstances({ transforms, opacity = 0.42 }) {
  const meshRef = useRef();
  const local = useInstanceScratch();

  useEffect(() => {
    if (!meshRef.current) return;
    transforms.forEach((mark, index) => {
      copyPosition(local.pos, mark.position);
      local.quat.setFromEuler(new THREE.Euler(mark.rotation[0], mark.rotation[1], mark.rotation[2]));
      copyScale(local.scale, mark.scale);
      local.matrix.compose(local.pos, local.quat, local.scale);
      meshRef.current.setMatrixAt(index, local.matrix);
      local.color.set(mark.color);
      meshRef.current.setColorAt(index, local.color);
    });
    syncInstanceMesh(meshRef.current, transforms.length);
  }, [local, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={opacity} toneMapped={false} />
    </instancedMesh>
  );
}

export function GroundDecalInstances({
  transforms,
  shape = 'circle',
  segments = 28,
  ringArgs = [0.42, 0.52, 4],
  opacity = 0.18,
  doubleSide = false,
  feathered = false
}) {
  const meshRef = useRef();
  const local = useInstanceScratch();
  const alphaMap = useMemo(() => feathered ? createRadialAlphaMap() : null, [feathered]);

  useEffect(() => () => alphaMap?.dispose(), [alphaMap]);

  useEffect(() => {
    if (!meshRef.current) return;
    transforms.forEach((mark, index) => {
      copyPosition(local.pos, mark.position);
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, mark.rotation ?? 0));
      copyScale(local.scale, mark.scale);
      local.matrix.compose(local.pos, local.quat, local.scale);
      meshRef.current.setMatrixAt(index, local.matrix);
      local.color.set(mark.color ?? '#ffffff');
      meshRef.current.setColorAt(index, local.color);
    });
    syncInstanceMesh(meshRef.current, transforms.length);
  }, [local, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, transforms.length]} frustumCulled={false}>
      {shape === 'plane' && <planeGeometry args={[1, 1]} />}
      {shape === 'circle' && <circleGeometry args={[1, segments]} />}
      {shape === 'ring' && <ringGeometry args={ringArgs} />}
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={opacity}
        alphaMap={alphaMap}
        depthWrite={false}
        side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export function TerrainStoneInstances({ transforms, roll = 0.04 }) {
  const stoneRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!stoneRef.current) return;
    transforms.forEach((stone, index) => {
      if (Array.isArray(stone.position)) local.pos.fromArray(stone.position);
      else local.pos.copy(stone.position);
      local.quat.setFromEuler(new THREE.Euler(0.08, stone.rotation, roll));
      const scale = stone.scale ?? [1, 1, 1];
      local.scale.set(scale[0], scale[1], scale[2] ?? 1);
      local.matrix.compose(local.pos, local.quat, local.scale);
      stoneRef.current.setMatrixAt(index, local.matrix);
      local.color.set(stone.color ?? '#8b8a68');
      stoneRef.current.setColorAt(index, local.color);
    });
    syncInstanceMesh(stoneRef.current, transforms.length);
  }, [local, roll, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={stoneRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial vertexColors roughness={0.94} metalness={0.01} />
    </instancedMesh>
  );
}
