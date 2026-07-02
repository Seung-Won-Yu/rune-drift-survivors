import { useMemo } from 'react';
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
