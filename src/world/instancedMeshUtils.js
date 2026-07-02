export function syncInstanceMesh(mesh, count) {
  if (!mesh) return;
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function syncInstanceMeshes(meshes, count) {
  meshes.forEach(mesh => syncInstanceMesh(mesh, count));
}
