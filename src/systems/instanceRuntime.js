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
    const valueScale = Math.min(0.24, Math.max(0, gem.value - 4) * 0.018);
    const scale = 0.88 + valueScale + Math.sin(gem.pulse) * 0.08 + (gem.magnetized ? 0.1 : 0);
    scratch.euler.set(0.18, gem.pulse * 0.16 + index * 0.07, Math.PI / 4);
    scratch.quat.setFromEuler(scratch.euler);
    scratch.matrix.compose(gem.pos, scratch.quat, scratch.scale.setScalar(scale));
    gemMesh.current.setMatrixAt(index, scratch.matrix);
  }
  gemMesh.current.count = gemCount;
  gemMesh.current.instanceMatrix.needsUpdate = true;
}
