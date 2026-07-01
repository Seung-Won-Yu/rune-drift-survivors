import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function useInstancedModelParts(url, normalizeOrigin = false) {
  const { scene } = useGLTF(url);

  return useMemo(() => {
    const model = scene.clone(true);
    model.updateMatrixWorld(true);
    const originMatrix = new THREE.Matrix4();
    if (normalizeOrigin) {
      const bounds = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      bounds.getCenter(center);
      originMatrix.makeTranslation(-center.x, -bounds.min.y, -center.z);
    }
    const parts = [];
    model.traverse(child => {
      if (!child.isMesh) return;
      const material = Array.isArray(child.material)
        ? child.material.map(item => item.clone())
        : child.material.clone();
      if (Array.isArray(material)) {
        material.forEach(item => {
          item.roughness = Math.min(0.92, item.roughness ?? 0.72);
        });
      } else {
        material.roughness = Math.min(0.92, material.roughness ?? 0.72);
      }
      parts.push({
        geometry: child.geometry,
        material,
        localMatrix: normalizeOrigin
          ? originMatrix.clone().multiply(child.matrixWorld)
          : child.matrixWorld.clone()
      });
    });
    return parts;
  }, [normalizeOrigin, scene]);
}

export function StaticModelInstances({ url, transforms, castShadow = false, receiveShadow = false, materialColor, normalizeOrigin = false }) {
  const parts = useInstancedModelParts(url, normalizeOrigin);
  const styledParts = useMemo(() => {
    if (!materialColor) return parts;
    const color = new THREE.Color(materialColor);
    return parts.map(part => {
      const material = Array.isArray(part.material)
        ? part.material.map(item => {
          const clone = item.clone();
          clone.color?.copy(color);
          if (clone.map) clone.map = null;
          clone.emissive?.set(color).multiplyScalar(0.045);
          return clone;
        })
        : part.material.clone();
      if (!Array.isArray(material)) {
        material.color?.copy(color);
        if (material.map) material.map = null;
        material.emissive?.set(color).multiplyScalar(0.045);
      }
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
      mesh.count = transforms.length;
      mesh.instanceMatrix.needsUpdate = true;
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
