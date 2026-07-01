import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';

export function PerimeterGroveSilhouettes({ visualQuality = 'high' }) {
  const transforms = useMemo(() => {
    const baseAngles = visualQuality === 'low'
      ? [-2.42, -0.74, 1.02, 2.62]
      : [-2.72, -2.18, -1.38, -0.52, 0.44, 1.06, 1.92, 2.66];
    return baseAngles.flatMap((angle, clusterIndex) => {
      const treeCount = visualQuality === 'high' ? 4 : 3;
      return Array.from({ length: treeCount }, (_, treeIndex) => {
        const side = treeIndex - (treeCount - 1) / 2;
        const radius = 88 + (clusterIndex % 3) * 7.2 + treeIndex * 1.9;
        const localAngle = angle + side * 0.045 + Math.sin(clusterIndex * 1.7 + treeIndex) * 0.025;
        const x = Math.cos(localAngle) * radius + Math.cos(angle + Math.PI / 2) * side * 3.2;
        const z = Math.sin(localAngle) * radius + Math.sin(angle + Math.PI / 2) * side * 3.2;
        const scale = 1.2 + (clusterIndex % 3) * 0.12 + treeIndex * 0.08;
        return {
          position: new THREE.Vector3(x, getTerrainHeight(x, z), z),
          rotation: -localAngle + Math.PI / 2 + side * 0.08,
          trunkScale: [0.16 * scale, 1.15 * scale, 0.16 * scale],
          canopyScale: [0.88 * scale, 1.08 * scale, 0.82 * scale],
          shadowScale: [1.5 * scale, 0.88 * scale, 1],
          trunkColor: clusterIndex % 2 ? '#6f5336' : '#604837',
          canopyColor: clusterIndex % 3 === 0 ? '#5ca766' : clusterIndex % 3 === 1 ? '#6fb75b' : '#4f8f69'
        };
      });
    }).filter(item => {
      const distance = item.position.length();
      const centerSightline = item.position.z > 6 && Math.abs(item.position.x) < 66;
      return distance > 78 && distance < ARENA_RADIUS - 4 && !centerSightline;
    });
  }, [visualQuality]);

  const trunkRef = useRef();
  const canopyRef = useRef();
  const shadowRef = useRef();
  const local = useMemo(() => ({
    matrix: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    color: new THREE.Color()
  }), []);

  useEffect(() => {
    if (!trunkRef.current || !canopyRef.current || !shadowRef.current) return;
    transforms.forEach((transform, index) => {
      local.pos.copy(transform.position);
      local.pos.y += transform.trunkScale[1] * 0.5;
      local.quat.setFromEuler(new THREE.Euler(0.02, transform.rotation, index % 2 ? 0.035 : -0.025));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.trunkScale[0], transform.trunkScale[1], transform.trunkScale[2]));
      trunkRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.trunkColor);
      trunkRef.current.setColorAt(index, local.color);

      local.pos.copy(transform.position);
      local.pos.y += transform.trunkScale[1] + transform.canopyScale[1] * 0.42;
      local.quat.setFromEuler(new THREE.Euler(index % 2 ? 0.08 : -0.06, transform.rotation + index * 0.12, index % 2 ? -0.05 : 0.04));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.canopyScale[0], transform.canopyScale[1], transform.canopyScale[2]));
      canopyRef.current.setMatrixAt(index, local.matrix);
      local.color.set(transform.canopyColor);
      canopyRef.current.setColorAt(index, local.color);

      local.pos.copy(transform.position);
      local.pos.y += 0.055;
      local.quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, transform.rotation));
      local.matrix.compose(local.pos, local.quat, local.scale.set(transform.shadowScale[0], transform.shadowScale[1], transform.shadowScale[2]));
      shadowRef.current.setMatrixAt(index, local.matrix);
    });
    [trunkRef.current, canopyRef.current, shadowRef.current].forEach(mesh => {
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [local, transforms]);

  return (
    <group>
      <instancedMesh ref={shadowRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color="#2d4d30" transparent opacity={0.08} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trunkRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <cylinderGeometry args={[1, 0.76, 1, 6]} />
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.01} />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[null, null, transforms.length]} frustumCulled={false}>
        <coneGeometry args={[1, 1.38, 7]} />
        <meshStandardMaterial vertexColors roughness={0.86} metalness={0.01} />
      </instancedMesh>
    </group>
  );
}
