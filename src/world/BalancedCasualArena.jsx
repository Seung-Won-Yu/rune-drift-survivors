import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createBalancedCasualArenaLayout } from '../systems/mapLayout.js';
import { getTerrainHeight } from '../systems/terrain.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';

export function BalancedCasualArena({ visualQuality = 'balanced' }) {
  const arena = useMemo(() => createBalancedCasualArenaLayout(visualQuality), [visualQuality]);

  return (
    <group>
      <GroundDecalInstances transforms={arena.edgeShadePatches} shape="circle" segments={28} opacity={visualQuality === 'low' ? 0.055 : 0.11} />
      <GroundDecalInstances transforms={arena.centralPlaza} shape="circle" segments={40} opacity={visualQuality === 'low' ? 0.12 : 0.19} />
      <GroundDecalInstances transforms={arena.trailSegments} shape="plane" opacity={visualQuality === 'low' ? 0.07 : 0.14} doubleSide />
      <GroundDecalInstances transforms={arena.meadowPatches} shape="circle" segments={24} opacity={visualQuality === 'low' ? 0.035 : 0.082} />
      <GroundDecalInstances transforms={arena.shrinePads} shape="circle" segments={28} opacity={visualQuality === 'low' ? 0.06 : 0.105} />
      <GroundDecalInstances transforms={arena.pondPatches} shape="circle" segments={24} opacity={visualQuality === 'low' ? 0.075 : 0.135} />
      <GroundDecalInstances transforms={arena.pondHighlights} shape="ring" ringArgs={[0.42, 0.52, 18]} opacity={visualQuality === 'low' ? 0.075 : 0.13} doubleSide />
      <GroundDecalInstances transforms={arena.treeShadows} shape="circle" segments={18} opacity={visualQuality === 'low' ? 0.04 : 0.085} />
      <GroundDecalInstances transforms={arena.flowerFlecks} shape="ring" ringArgs={[0.32, 0.52, 5]} opacity={visualQuality === 'low' ? 0.075 : 0.12} doubleSide />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.078, 0]}>
        <ringGeometry args={[12.8, 13.1, 72]} />
        <meshBasicMaterial color="#f0ca67" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, getTerrainHeight(0, 0) + 0.084, 0]}>
        <ringGeometry args={[34.0, 34.24, 96]} />
        <meshBasicMaterial color="#acd977" transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      <RelicBoxInstances transforms={arena.ruinSlabs} roughness={0.98} />
      <RelicOctahedronInstances transforms={arena.runeCrystals} opacity={visualQuality === 'low' ? 0.42 : 0.58} />
      <BalancedArenaPropInstances trees={arena.trees} bushes={arena.bushes} rocks={arena.rocks} grassTufts={arena.grassTufts} />
    </group>
  );
}

function BalancedArenaPropInstances({ trees, bushes, rocks, grassTufts }) {
  const trunkRef = useRef();
  const canopyRef = useRef();
  const bushRef = useRef();
  const rockRef = useRef();
  const tuftRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (trunkRef.current && canopyRef.current) {
      trees.forEach((tree, index) => {
        local.pos.copy(tree.position);
        local.pos.y = getTerrainHeight(tree.position.x, tree.position.z) + 0.46 * tree.scale;
        local.quat.setFromEuler(new THREE.Euler(0.03, tree.rotation, index % 2 ? 0.035 : -0.03));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.13 * tree.scale, 0.88 * tree.scale, 0.13 * tree.scale));
        trunkRef.current.setMatrixAt(index, local.matrix);
        local.color.set(tree.trunkColor);
        trunkRef.current.setColorAt(index, local.color);

        local.pos.copy(tree.position);
        local.pos.y = getTerrainHeight(tree.position.x, tree.position.z) + 1.17 * tree.scale;
        local.quat.setFromEuler(new THREE.Euler(index % 2 ? 0.06 : -0.04, tree.rotation + index * 0.11, index % 2 ? -0.04 : 0.04));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.72 * tree.scale, 1.08 * tree.scale, 0.72 * tree.scale));
        canopyRef.current.setMatrixAt(index, local.matrix);
        local.color.set(tree.canopyColor);
        canopyRef.current.setColorAt(index, local.color);
      });
      [trunkRef.current, canopyRef.current].forEach(mesh => {
        mesh.count = trees.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      });
    }

    if (rockRef.current) {
      rocks.forEach((rock, index) => {
        local.pos.copy(rock.position);
        local.quat.setFromEuler(new THREE.Euler(0.1, rock.rotation, index % 2 ? 0.08 : -0.06));
        local.matrix.compose(local.pos, local.quat, local.scale.set(rock.scale[0], rock.scale[1], rock.scale[2]));
        rockRef.current.setMatrixAt(index, local.matrix);
        local.color.set(rock.color);
        rockRef.current.setColorAt(index, local.color);
      });
      rockRef.current.count = rocks.length;
      rockRef.current.instanceMatrix.needsUpdate = true;
      if (rockRef.current.instanceColor) rockRef.current.instanceColor.needsUpdate = true;
    }

    if (bushRef.current) {
      bushes.forEach((bush, index) => {
        local.pos.copy(bush.position);
        local.pos.y = getTerrainHeight(bush.position.x, bush.position.z) + 0.28 * bush.scale;
        local.quat.setFromEuler(new THREE.Euler(0.04, bush.rotation, index % 2 ? 0.06 : -0.05));
        local.matrix.compose(local.pos, local.quat, local.scale.set(0.74 * bush.scale, 0.52 * bush.scale, 0.66 * bush.scale));
        bushRef.current.setMatrixAt(index, local.matrix);
        local.color.set(bush.color);
        bushRef.current.setColorAt(index, local.color);
      });
      bushRef.current.count = bushes.length;
      bushRef.current.instanceMatrix.needsUpdate = true;
      if (bushRef.current.instanceColor) bushRef.current.instanceColor.needsUpdate = true;
    }

    if (tuftRef.current) {
      grassTufts.forEach((tuft, index) => {
        local.pos.copy(tuft.position);
        local.quat.setFromEuler(new THREE.Euler(0.08, tuft.rotation, index % 2 ? 0.07 : -0.07));
        local.matrix.compose(local.pos, local.quat, local.scale.set(tuft.scale[0], tuft.scale[1], tuft.scale[2]));
        tuftRef.current.setMatrixAt(index, local.matrix);
        local.color.set(tuft.color);
        tuftRef.current.setColorAt(index, local.color);
      });
      tuftRef.current.count = grassTufts.length;
      tuftRef.current.instanceMatrix.needsUpdate = true;
      if (tuftRef.current.instanceColor) tuftRef.current.instanceColor.needsUpdate = true;
    }
  }, [bushes, grassTufts, local, rocks, trees]);

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, trees.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 0.78, 1, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[null, null, trees.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1.35, 6]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={bushRef} args={[null, null, bushes.length]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[null, null, rocks.length]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tuftRef} args={[null, null, grassTufts.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1, 5]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
