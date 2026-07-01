import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

function useInstanceScratch() {
  return useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);
}

function commitInstanceMesh(mesh, count) {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
    commitInstanceMesh(meshRef.current, transforms.length);
  }, [local, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
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
    commitInstanceMesh(meshRef.current, transforms.length);
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
  doubleSide = false
}) {
  const meshRef = useRef();
  const local = useInstanceScratch();

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
    commitInstanceMesh(meshRef.current, transforms.length);
  }, [local, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, transforms.length]} frustumCulled={false}>
      {shape === 'plane' && <planeGeometry args={[1, 1]} />}
      {shape === 'circle' && <circleGeometry args={[1, segments]} />}
      {shape === 'ring' && <ringGeometry args={ringArgs} />}
      <meshBasicMaterial vertexColors transparent opacity={opacity} depthWrite={false} side={doubleSide ? THREE.DoubleSide : THREE.FrontSide} toneMapped={false} />
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
    commitInstanceMesh(stoneRef.current, transforms.length);
  }, [local, roll, transforms]);

  if (!transforms.length) return null;

  return (
    <instancedMesh ref={stoneRef} args={[null, null, transforms.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshBasicMaterial vertexColors toneMapped={false} />
    </instancedMesh>
  );
}
