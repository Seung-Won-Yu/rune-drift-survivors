import { Suspense } from 'react';

import { ARENA_RADIUS } from '../config/gameTuning.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { BalancedCasualArena } from './BalancedCasualArena.jsx';
import { BalancedNatureAssetAccents } from './BalancedNatureAssetAccents.jsx';
import { CasualFieldBackdrop } from './CasualFieldBackdrop.jsx';
import { FieldBiomeLandmarks } from './FieldBiomeLandmarks.jsx';
import { FieldCampLandmarks } from './FieldCampLandmarks.jsx';
import { FieldPathNetwork } from './FieldPathNetwork.jsx';
import { ImportedForestBattlefield } from './ImportedForestBattlefield.jsx';
import { NaturalFieldKit } from './NaturalFieldKit.jsx';
import { OpenFieldTerrainIdentity } from './OpenFieldTerrainIdentity.jsx';
import { PerimeterGroveSilhouettes } from './PerimeterGroveSilhouettes.jsx';
import { RiftFloorSigils } from './RiftFloorSigils.jsx';
import { RuneRelicLandmarks, TerrainStoryDetails } from './RuneRelicLandmarks.jsx';
import { SculptedRuinTerrain } from './SculptedRuinTerrain.jsx';

export function MapBaseArena({ visualQuality = 'high' }) {
  const edgeSegments = visualQuality === 'low' ? 80 : visualQuality === 'balanced' ? 112 : 152;
  const highDetail = visualQuality === 'high';

  return (
    <group>
      <mesh receiveShadow position={[0, -2.05, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS + 18.0, ARENA_RADIUS + 8.0, 1.5, edgeSegments]} />
        <meshStandardMaterial color="#425f35" roughness={0.99} metalness={0.01} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.08, 0]}>
        <circleGeometry args={[ARENA_RADIUS + 42.0, edgeSegments]} />
        <meshStandardMaterial color="#769956" roughness={1} metalness={0} />
      </mesh>

      <SculptedRuinTerrain visualQuality={visualQuality} />
      {highDetail ? (
        <>
          <CasualFieldBackdrop visualQuality={visualQuality} />
          <OpenFieldTerrainIdentity visualQuality={visualQuality} />
          <FieldPathNetwork visualQuality={visualQuality} />
          <FieldCampLandmarks visualQuality={visualQuality} />
          <TerrainStoryDetails />
          <RiftFloorSigils />
        </>
      ) : (
        <BalancedCasualArena visualQuality={visualQuality} />
      )}
      {visualQuality === 'balanced' && (
        <Suspense fallback={null}>
          <BalancedNatureAssetAccents />
        </Suspense>
      )}
      <RuneRelicLandmarks visualQuality={visualQuality} />
      {highDetail && (
        <Suspense fallback={null}>
          <ImportedForestBattlefield visualQuality={visualQuality} />
        </Suspense>
      )}
      {highDetail && <NaturalFieldKit visualQuality={visualQuality} />}
      {highDetail && <FieldBiomeLandmarks visualQuality={visualQuality} />}
      {highDetail && <PerimeterGroveSilhouettes visualQuality={visualQuality} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, getTerrainHeight(0, 0) + 0.07, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 1.35, ARENA_RADIUS - 1.02, edgeSegments]} />
        <meshBasicMaterial color="#f0ca67" transparent opacity={0.11} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 10]} position={[0, getTerrainHeight(0, 0) + 0.09, 0]}>
        <ringGeometry args={[ARENA_RADIUS - 8.8, ARENA_RADIUS - 8.55, edgeSegments]} />
        <meshBasicMaterial color="#c4e878" transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
