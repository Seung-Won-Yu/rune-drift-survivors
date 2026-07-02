export function renderGemInstances({
  gemMesh,
  xpGems,
  runtimeBudget,
  scratch
}) {
  if (!gemMesh.current) return;
  const gemCount = Math.min(xpGems.current.length, runtimeBudget.maxXpGems);
  for (let index = 0; index < gemCount; index += 1) {
    const gem = xpGems.current[index];
    const scale = 1.22 + Math.sin(gem.pulse) * 0.22;
    scratch.matrix.compose(gem.pos, scratch.quat, scratch.scale.setScalar(scale));
    gemMesh.current.setMatrixAt(index, scratch.matrix);
  }
  gemMesh.current.count = gemCount;
  gemMesh.current.instanceMatrix.needsUpdate = true;
}
