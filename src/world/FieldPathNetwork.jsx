import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';

export function FieldPathNetwork({ visualQuality = 'high' }) {
  const marks = useMemo(() => {
    const tuftCount = visualQuality === 'low' ? 18 : visualQuality === 'balanced' ? 30 : 42;
    const trailSpecs = [
      { angle: -0.18, count: 6, start: 20, step: 12, color: '#d4ad64', width: 4.4 },
      { angle: 1.22, count: 5, start: 26, step: 13, color: '#a6c86a', width: 4.0 },
      { angle: 2.82, count: 5, start: 30, step: 11, color: '#c49d59', width: 3.7 },
      { angle: 4.48, count: 5, start: 24, step: 12, color: '#92bd63', width: 3.9 }
    ];

    const trails = trailSpecs.flatMap((spec, routeIndex) => (
      Array.from({ length: spec.count }, (_, index) => {
        const radius = spec.start + spec.step * index;
        const bend = Math.sin(index * 0.9 + routeIndex) * 3.8;
        const sideAngle = spec.angle + Math.PI / 2;
        const x = Math.cos(spec.angle) * radius + Math.cos(sideAngle) * bend;
        const z = Math.sin(spec.angle) * radius + Math.sin(sideAngle) * bend;
        return {
          position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.052, z),
          rotation: -spec.angle + Math.PI / 2 + Math.sin(index + routeIndex) * 0.12,
          scale: [8.8 + index * 0.55, spec.width + (index % 2) * 0.5, 1],
          color: spec.color,
          opacity: 0.2 - Math.min(0.06, index * 0.008)
        };
      })
    )).filter(mark => mark.position.length() < ARENA_RADIUS - 13 && mark.position.length() > 16);

    const tufts = Array.from({ length: tuftCount }, (_, index) => {
      const ring = index % 3;
      const angle = index * 2.07 + ring * 0.42;
      const radius = 30 + (index % 19) * 4.1 + Math.sin(index * 1.4) * 1.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.14, z),
        rotation: -angle + Math.PI / 2 + Math.sin(index) * 0.32,
        scale: [0.36 + (index % 4) * 0.06, 0.55 + (index % 3) * 0.09, 0.36 + (index % 5) * 0.04],
        color: index % 5 === 0 ? '#d8bd67' : index % 3 === 0 ? '#9fd66d' : '#6faa5f'
      };
    }).filter(mark => {
      const distance = mark.position.length();
      return distance > 24 && distance < ARENA_RADIUS - 10;
    });

    const postCount = visualQuality === 'high' ? 18 : 0;
    const posts = Array.from({ length: postCount }, (_, index) => {
      const angle = index * Math.PI * 2 / postCount + 0.34;
      const radius = 74 + (index % 4) * 5.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.44, z),
        rotation: -angle + Math.PI / 2,
        scale: [0.12, 0.86 + (index % 3) * 0.12, 0.12],
        color: index % 2 ? '#7a5737' : '#6a4b31'
      };
    }).filter(mark => !(mark.position.z > 18 && Math.abs(mark.position.x) < 58));

    const planks = visualQuality === 'high'
      ? posts.filter((_, index) => index % 3 !== 1).map((post, index) => ({
        position: new THREE.Vector3(post.position.x, post.position.y + 0.1, post.position.z),
        rotation: post.rotation + (index % 2 ? 0.18 : -0.14),
        scale: [1.18 + (index % 3) * 0.16, 0.12, 0.18],
        color: index % 2 ? '#8a6440' : '#735238'
      }))
      : [];

    return { trails, tufts, posts, planks };
  }, [visualQuality]);

  const trailRef = useRef();
  const tuftRef = useRef();
  const postRef = useRef();
  const plankRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (trailRef.current) {
      marks.trails.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, mark.rotation));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        trailRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        trailRef.current.setColorAt(index, local.color);
      });
      trailRef.current.count = marks.trails.length;
      trailRef.current.instanceMatrix.needsUpdate = true;
      if (trailRef.current.instanceColor) trailRef.current.instanceColor.needsUpdate = true;
    }

    if (tuftRef.current) {
      marks.tufts.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(0.08, mark.rotation, index % 2 ? 0.08 : -0.08));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        tuftRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        tuftRef.current.setColorAt(index, local.color);
      });
      tuftRef.current.count = marks.tufts.length;
      tuftRef.current.instanceMatrix.needsUpdate = true;
      if (tuftRef.current.instanceColor) tuftRef.current.instanceColor.needsUpdate = true;
    }

    if (postRef.current) {
      marks.posts.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(0.06, mark.rotation, index % 2 ? -0.04 : 0.035));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        postRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        postRef.current.setColorAt(index, local.color);
      });
      postRef.current.count = marks.posts.length;
      postRef.current.instanceMatrix.needsUpdate = true;
      if (postRef.current.instanceColor) postRef.current.instanceColor.needsUpdate = true;
    }

    if (plankRef.current) {
      marks.planks.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(index % 2 ? 0.08 : -0.05, mark.rotation, index % 2 ? 0.04 : -0.04));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        plankRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        plankRef.current.setColorAt(index, local.color);
      });
      plankRef.current.count = marks.planks.length;
      plankRef.current.instanceMatrix.needsUpdate = true;
      if (plankRef.current.instanceColor) plankRef.current.instanceColor.needsUpdate = true;
    }
  }, [local, marks]);

  return (
    <group>
      <instancedMesh ref={trailRef} args={[null, null, marks.trails.length]} frustumCulled={false}>
        <circleGeometry args={[1, 24]} />
        <meshBasicMaterial vertexColors transparent opacity={visualQuality === 'high' ? 0.22 : 0.11} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tuftRef} args={[null, null, marks.tufts.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 5]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={postRef} args={[null, null, marks.posts.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 0.86, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={plankRef} args={[null, null, marks.planks.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.01} />
      </instancedMesh>
    </group>
  );
}
