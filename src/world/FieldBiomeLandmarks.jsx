import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';

export function FieldBiomeLandmarks({ visualQuality = 'high' }) {
  const marks = useMemo(() => {
    const bloomCount = visualQuality === 'low' ? 10 : visualQuality === 'balanced' ? 18 : 42;
    const cairnCount = visualQuality === 'high' ? 12 : 0;
    const bannerCount = visualQuality === 'high' ? 7 : 0;

    const anchorPoints = [
      { x: -58, z: -22, hue: '#82c96b' },
      { x: 42, z: -36, hue: '#e0b85f' },
      { x: -36, z: 46, hue: '#8ccf77' },
      { x: 58, z: 34, hue: '#b8c86a' },
      { x: 16, z: 64, hue: '#75b96e' }
    ];

    const blooms = Array.from({ length: bloomCount }, (_, index) => {
      const anchor = anchorPoints[index % anchorPoints.length];
      const swirl = index * 1.83;
      const spread = 3.4 + (index % 5) * 1.25;
      const x = anchor.x + Math.cos(swirl) * spread + Math.sin(index * 0.72) * 1.8;
      const z = anchor.z + Math.sin(swirl) * spread * 0.62 + Math.cos(index * 0.81) * 1.2;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.082, z),
        rotation: swirl + index * 0.11,
        scale: 0.18 + (index % 4) * 0.045,
        color: index % 6 === 0 ? '#f0ca67' : index % 5 === 0 ? '#b596d8' : anchor.hue
      };
    }).filter(mark => mark.position.length() > 24 && mark.position.length() < ARENA_RADIUS - 12);

    const cairns = Array.from({ length: cairnCount }, (_, index) => {
      const angle = index * Math.PI * 2 / cairnCount + 0.38;
      const radius = 34 + (index % 4) * 13 + Math.sin(index * 1.4) * 2.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z) + 0.22, z),
        rotation: -angle + Math.PI / 2,
        scale: [0.42 + (index % 3) * 0.08, 0.18 + (index % 2) * 0.04, 0.34 + (index % 4) * 0.06],
        color: index % 2 ? '#9b9871' : '#7d8c68'
      };
    }).filter(mark => Math.abs(mark.position.z) > 16 || Math.abs(mark.position.x) > 28);

    const banners = Array.from({ length: bannerCount }, (_, index) => {
      const angle = index * Math.PI * 2 / bannerCount + 0.7;
      const radius = 62 + (index % 3) * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return {
        position: new THREE.Vector3(x, getTerrainHeight(x, z), z),
        rotation: -angle + Math.PI / 2,
        poleHeight: 1.2 + (index % 3) * 0.18,
        color: index % 3 === 0 ? '#efd06b' : index % 3 === 1 ? '#7bd38b' : '#77bdd8'
      };
    }).filter(mark => !(mark.position.z > 16 && Math.abs(mark.position.x) < 54));

    const ponds = [
      { x: -68, z: 30, sx: 3.8, sz: 1.24, color: '#74cdb6' },
      { x: 68, z: -22, sx: 3.1, sz: 1.05, color: '#7bc7a2' },
      { x: 6, z: -72, sx: 4.4, sz: 1.16, color: '#d6b866' }
    ].map((pond, index) => ({
      position: new THREE.Vector3(pond.x, getTerrainHeight(pond.x, pond.z) + 0.054, pond.z),
      rotation: index * 0.54,
      scale: [pond.sx, pond.sz, 1],
      color: pond.color
    }));

    return { blooms, cairns, banners, ponds };
  }, [visualQuality]);

  const bloomRef = useRef();
  const cairnRef = useRef();
  const poleRef = useRef();
  const flagRef = useRef();
  const pondRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (bloomRef.current) {
      marks.blooms.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, mark.rotation));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale, mark.scale * 0.7, 1));
        bloomRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        bloomRef.current.setColorAt(index, local.color);
      });
      bloomRef.current.count = marks.blooms.length;
      bloomRef.current.instanceMatrix.needsUpdate = true;
      if (bloomRef.current.instanceColor) bloomRef.current.instanceColor.needsUpdate = true;
    }

    if (cairnRef.current) {
      marks.cairns.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(0.12, mark.rotation, index % 2 ? 0.08 : -0.06));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        cairnRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        cairnRef.current.setColorAt(index, local.color);
      });
      cairnRef.current.count = marks.cairns.length;
      cairnRef.current.instanceMatrix.needsUpdate = true;
      if (cairnRef.current.instanceColor) cairnRef.current.instanceColor.needsUpdate = true;
    }

    if (poleRef.current && flagRef.current) {
      marks.banners.forEach((mark, index) => {
        local.pos.copy(mark.position);
        local.pos.y += mark.poleHeight * 0.5;
        local.quat.setFromEuler(new THREE.Euler(0.02, mark.rotation, index % 2 ? 0.04 : -0.03));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.08, mark.poleHeight, 0.08));
        poleRef.current.setMatrixAt(index, local.matrix);

        local.pos.copy(mark.position);
        local.pos.y += mark.poleHeight + 0.34;
        local.pos.x += Math.cos(mark.rotation) * 0.28;
        local.pos.z += Math.sin(mark.rotation) * 0.28;
        local.quat.setFromEuler(new THREE.Euler(0.08, mark.rotation - Math.PI / 2, index % 2 ? -0.1 : 0.08));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.52, 0.32, 1));
        flagRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        flagRef.current.setColorAt(index, local.color);
      });
      [poleRef.current, flagRef.current].forEach(mesh => {
        mesh.count = marks.banners.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
    }

    if (pondRef.current) {
      marks.ponds.forEach((mark, index) => {
        local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, mark.rotation));
        local.matrix.compose(mark.position, local.quat, local.scale.set(mark.scale[0], mark.scale[1], mark.scale[2]));
        pondRef.current.setMatrixAt(index, local.matrix);
        local.color.set(mark.color);
        pondRef.current.setColorAt(index, local.color);
      });
      pondRef.current.count = marks.ponds.length;
      pondRef.current.instanceMatrix.needsUpdate = true;
      if (pondRef.current.instanceColor) pondRef.current.instanceColor.needsUpdate = true;
    }
  }, [local, marks]);

  return (
    <group>
      <instancedMesh ref={pondRef} args={[null, null, marks.ponds.length]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial vertexColors transparent opacity={visualQuality === 'high' ? 0.2 : 0.12} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bloomRef} args={[null, null, marks.blooms.length]} frustumCulled={false}>
        <ringGeometry args={[0.36, 0.76, 5]} />
        <meshBasicMaterial vertexColors transparent opacity={visualQuality === 'high' ? 0.58 : 0.34} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      {marks.cairns.length > 0 && (
        <instancedMesh ref={cairnRef} args={[null, null, marks.cairns.length]} frustumCulled={false}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshBasicMaterial vertexColors toneMapped={false} />
        </instancedMesh>
      )}
      {marks.banners.length > 0 && (
        <>
          <instancedMesh ref={poleRef} args={[null, null, marks.banners.length]} frustumCulled={false}>
            <cylinderGeometry args={[1, 0.86, 1, 6]} />
            <meshStandardMaterial color="#6a4e32" roughness={0.9} metalness={0.01} />
          </instancedMesh>
          <instancedMesh ref={flagRef} args={[null, null, marks.banners.length]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial vertexColors transparent opacity={0.72} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </instancedMesh>
        </>
      )}
    </group>
  );
}
