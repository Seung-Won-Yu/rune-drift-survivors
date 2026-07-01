import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getTerrainHeight } from '../systems/terrain.js';
import { GroundDecalInstances } from './InstancedGeometry.jsx';

export function FieldCampLandmarks({ visualQuality = 'high' }) {
  const marks = useMemo(() => {
    const clusterLimit = visualQuality === 'low' ? 2 : visualQuality === 'balanced' ? 4 : 5;
    const clusterSeeds = [
      { angle: -0.78, radius: 64, color: '#e5bd5e', accent: '#75c986' },
      { angle: 0.86, radius: 72, color: '#77bdd8', accent: '#efd06b' },
      { angle: 2.34, radius: 66, color: '#ef9b67', accent: '#8fd070' },
      { angle: 3.78, radius: 78, color: '#b596d8', accent: '#e4c76c' },
      { angle: 5.18, radius: 70, color: '#92cf70', accent: '#e6a15f' }
    ].slice(0, clusterLimit);

    const place = (angle, radius, side = 0, forward = 0, yOffset = 0) => {
      const tangent = angle + Math.PI / 2;
      const x = Math.cos(angle) * (radius + forward) + Math.cos(tangent) * side;
      const z = Math.sin(angle) * (radius + forward) + Math.sin(tangent) * side;
      return new THREE.Vector3(x, getTerrainHeight(x, z) + yOffset, z);
    };

    const clearings = clusterSeeds.map((seed, index) => ({
      position: place(seed.angle, seed.radius, 0, 0, 0.048),
      rotation: -seed.angle + Math.PI / 2,
      scale: [8.2 + (index % 2) * 1.2, 4.8 + (index % 3) * 0.5, 1],
      color: index % 2 ? '#b9c86c' : '#d8b865'
    }));

    const tents = clusterSeeds.map((seed, index) => ({
      position: place(seed.angle, seed.radius, -2.2, 0.8, 0.78),
      rotation: -seed.angle + Math.PI / 2 + (index % 2 ? 0.18 : -0.14),
      scale: [1.6 + (index % 2) * 0.18, 1.2 + (index % 3) * 0.12, 1.35],
      color: seed.color
    }));

    const crates = clusterSeeds.flatMap((seed, clusterIndex) => (
      Array.from({ length: visualQuality === 'high' ? 3 : 2 }, (_, index) => ({
        position: place(seed.angle, seed.radius, 1.8 + index * 1.2, -0.9 + (index % 2) * 0.7, 0.33),
        rotation: -seed.angle + Math.PI / 2 + index * 0.28,
        scale: [0.64 + (index % 2) * 0.14, 0.58 + (clusterIndex % 2) * 0.08, 0.64],
        color: index % 2 ? '#8a6440' : '#735238'
      }))
    ));

    const posts = clusterSeeds.flatMap((seed, clusterIndex) => (
      [-1, 1].map((side, index) => ({
        position: place(seed.angle, seed.radius, side * (4.1 + clusterIndex * 0.18), 2.8, 0.54),
        rotation: -seed.angle + Math.PI / 2 + side * 0.18,
        scale: [0.1, 1.08 + index * 0.1, 0.1],
        color: '#6a4b31'
      }))
    ));

    const pennants = clusterSeeds.flatMap((seed, clusterIndex) => (
      [-1, 1].map((side, index) => ({
        position: place(seed.angle, seed.radius, side * (4.1 + clusterIndex * 0.18), 2.8, 1.36),
        rotation: -seed.angle + Math.PI / 2 + side * 0.28,
        scale: [0.52, 0.32, 1],
        color: index % 2 ? seed.color : seed.accent
      }))
    ));

    const stones = clusterSeeds.flatMap((seed, clusterIndex) => (
      Array.from({ length: 5 }, (_, index) => {
        const angle = seed.angle + index * Math.PI * 2 / 5;
        const side = Math.cos(angle) * (1.8 + (index % 2) * 0.35);
        const forward = Math.sin(angle) * (1.2 + (index % 3) * 0.18);
        return {
          position: place(seed.angle, seed.radius, side, forward, 0.16),
          rotation: angle,
          scale: [0.36 + (index % 3) * 0.06, 0.18 + (clusterIndex % 2) * 0.04, 0.28 + (index % 2) * 0.06],
          color: index % 2 ? '#9b9871' : '#7d8c68'
        };
      })
    ));

    return { clearings, tents, crates, posts, pennants, stones };
  }, [visualQuality]);

  const tentRef = useRef();
  const crateRef = useRef();
  const postRef = useRef();
  const pennantRef = useRef();
  const stoneRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    const applyInstances = (mesh, transforms, rotationFactory) => {
      if (!mesh) return;
      transforms.forEach((mark, index) => {
        local.pos.copy(mark.position);
        local.quat.setFromEuler(rotationFactory(mark, index));
        local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2] ?? 1);
        local.matrix.compose(local.pos, local.quat, local.scale);
        mesh.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        mesh.setColorAt(index, local.color);
      });
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    applyInstances(tentRef.current, marks.tents, (mark, index) => new THREE.Euler(0.03, mark.rotation, index % 2 ? 0.02 : -0.02));
    applyInstances(crateRef.current, marks.crates, (mark, index) => new THREE.Euler(0.02, mark.rotation, index % 2 ? 0.04 : -0.04));
    applyInstances(postRef.current, marks.posts, (mark, index) => new THREE.Euler(0.04, mark.rotation, index % 2 ? 0.03 : -0.03));
    applyInstances(pennantRef.current, marks.pennants, (mark, index) => new THREE.Euler(0.08, mark.rotation, index % 2 ? -0.1 : 0.08));
    applyInstances(stoneRef.current, marks.stones, (mark, index) => new THREE.Euler(0.12, mark.rotation, index % 2 ? 0.08 : -0.06));
  }, [local, marks]);

  return (
    <group>
      <GroundDecalInstances transforms={marks.clearings} shape="circle" segments={32} opacity={0.2} />
      <instancedMesh ref={tentRef} args={[null, null, marks.tents.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 4]} />
        <meshStandardMaterial vertexColors roughness={0.88} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={crateRef} args={[null, null, marks.crates.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={postRef} args={[null, null, marks.posts.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 0.86, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.9} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={pennantRef} args={[null, null, marks.pennants.length]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial vertexColors transparent opacity={0.78} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={stoneRef} args={[null, null, marks.stones.length]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0.01} />
      </instancedMesh>
    </group>
  );
}
