import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { syncInstanceMesh } from './instancedMeshUtils.js';
import { useInstancedModelParts } from './useInstancedModelParts.js';

export function StaticModelInstances({ url, transforms, castShadow = false, receiveShadow = false, materialColor, normalizeOrigin = false }) {
  const parts = useInstancedModelParts(url, normalizeOrigin);
  const styledParts = useMemo(() => {
    if (!materialColor) return parts;
    const tint = new THREE.Color(materialColor);
    const createTintedMaterial = source => {
      const material = source?.clone() ?? new THREE.MeshStandardMaterial();
      if (material.color) {
        material.color.lerp(tint, material.map ? 0.32 : 0.56);
      }
      if ('roughness' in material) material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.78, 0.62, 0.92);
      if ('metalness' in material) material.metalness = Math.min(material.metalness ?? 0, 0.08);
      material.toneMapped = true;
      material.needsUpdate = true;
      return material;
    };
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => createTintedMaterial(item))
        : createTintedMaterial(part.material);
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
    if (!materialColor) return undefined;
    return () => {
      styledParts.forEach(part => {
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach(material => material?.dispose());
      });
    };
  }, [materialColor, styledParts]);

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
