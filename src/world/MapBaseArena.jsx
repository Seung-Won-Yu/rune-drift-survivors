import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { BalancedFieldArena } from './BalancedFieldArena.jsx';
import { PerimeterGroveSilhouettes } from './PerimeterGroveSilhouettes.jsx';
import { RuneBiomeZones } from './RuneBiomeZones.jsx';
import { RuneCircuitLandmarks } from './RuneCircuitLandmarks.jsx';
import { RuneCircuitPaths } from './RuneCircuitPaths.jsx';
import { RuneHeartPlaza } from './RuneHeartPlaza.jsx';
import { RuneRelicLandmarks } from './RuneRelicLandmarks.jsx';
import { SculptedRuinTerrain } from './SculptedRuinTerrain.jsx';

export function MapBaseArena({ visualQuality = 'high' }) {
  const edgeSegments = visualQuality === 'low' ? 80 : visualQuality === 'balanced' ? 112 : 152;

  return (
    <group>
      <mesh receiveShadow position={[0, -2.05, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS + 18.0, ARENA_RADIUS + 8.0, 1.5, edgeSegments]} />
        <meshStandardMaterial color="#0d1d19" roughness={0.99} metalness={0.01} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0]}>
        <circleGeometry args={[ARENA_RADIUS + 42.0, edgeSegments]} />
        <meshStandardMaterial color="#1b302a" roughness={1} metalness={0} />
      </mesh>

      <SculptedRuinTerrain visualQuality={visualQuality} />
      <RuneBiomeZones visualQuality={visualQuality} />
      <BalancedFieldArena visualQuality={visualQuality} />
      <RuneRelicLandmarks visualQuality={visualQuality} />
      {visualQuality !== 'low' && <PerimeterGroveSilhouettes visualQuality={visualQuality} />}
      <RuneCircuitPaths visualQuality={visualQuality} />
      <RuneHeartPlaza visualQuality={visualQuality} />
      <RuneCircuitLandmarks visualQuality={visualQuality} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.07, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 1.35, ARENA_RADIUS - 1.02, edgeSegments]} />
        <meshBasicMaterial color="#b58a45" transparent opacity={0.09} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 10]} position={[0, getTerrainHeight(0, 0) + 0.09, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 8.8, ARENA_RADIUS - 8.55, edgeSegments]} />
        <meshBasicMaterial color="#75ddd2" transparent opacity={0.045} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
