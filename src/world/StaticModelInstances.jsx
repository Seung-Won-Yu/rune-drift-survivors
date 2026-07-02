import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { syncInstanceMesh } from './instancedMeshUtils.js';
import { useInstancedModelParts } from './useInstancedModelParts.js';

export function StaticModelInstances({ url, transforms, castShadow = false, receiveShadow = false, materialColor, normalizeOrigin = false }) {
  const parts = useInstancedModelParts(url, normalizeOrigin);
  const styledParts = useMemo(() => {
    if (!materialColor) return parts;
    const color = new THREE.Color(materialColor);
    const createFlatMaterial = source => new THREE.MeshBasicMaterial({
      color,
      toneMapped: false,
      transparent: Boolean(source?.transparent),
      opacity: source?.opacity ?? 1,
      side: source?.side ?? THREE.FrontSide
    });
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => createFlatMaterial(item))
        : createFlatMaterial(part.material);
      return { ...part, material };
    });
  }, [materialColor, parts]);
  const meshRefs = useRef([]);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const local = useMemo(() => ({
    quat: new THREE.Quaternion(),
    scale: new THREE.Vector3(),
    base: new THREE.Matrix4(),
    final: new THREE.Matrix4(),
    euler: new THREE.Euler()
  }), []);

  useEffect(() => {
    styledParts.forEach((part, partIndex) => {
      const mesh = meshRefs.current[partIndex];
      if (!mesh) return;
      transforms.forEach((transform, index) => {
        if (transform.tilt) {
          local.euler.set(transform.tilt, transform.rotation, 0);
          local.quat.setFromEuler(local.euler);
        } else {
          local.quat.setFromAxisAngle(axis, transform.rotation);
        }
        if (Array.isArray(transform.modelScale)) {
          local.scale.set(transform.modelScale[0], transform.modelScale[1], transform.modelScale[2]);
        } else {
          local.scale.setScalar(transform.scale);
        }
        local.base.compose(transform.position, local.quat, local.scale);
        local.final.multiplyMatrices(local.base, part.localMatrix);
        mesh.setMatrixAt(index, local.final);
      });
      syncInstanceMesh(mesh, transforms.length);
    });
  }, [axis, local, styledParts, transforms]);

  return (
    <group>
      {styledParts.map((part, index) => (
        <instancedMesh
          key={`${url}-${index}`}
          ref={node => {
            meshRefs.current[index] = node;
          }}
          args={[part.geometry, part.material, transforms.length]}
          frustumCulled={false}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      ))}
    </group>
  );
}
