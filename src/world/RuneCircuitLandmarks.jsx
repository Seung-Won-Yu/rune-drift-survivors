import { useMemo } from 'react';

import { createRuneCircuitLandmarkLayout } from '../systems/mapLayout.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';
import { ShrineLandmarkVariants } from './ShrineLandmarkVariants.jsx';

export function RuneCircuitLandmarks({ visualQuality = 'balanced' }) {
  const layout = useMemo(
    () => createRuneCircuitLandmarkLayout(visualQuality),
    [visualQuality]
  );

  return (
    <group>
      <RelicBoxInstances transforms={layout.approachSteps} roughness={0.97} />
      <RelicBoxInstances transforms={layout.lowerBases} roughness={0.96} />
      <RelicBoxInstances transforms={layout.upperBases} roughness={0.9} />
      <ShrineLandmarkVariants sites={layout.signatureSites} visualQuality={visualQuality} />
      <RelicOctahedronInstances transforms={layout.rankStones} opacity={0.62} />
      <GroundDecalInstances
        transforms={layout.floorRings}
        shape="ring"
        ringArgs={[0.78, 0.88, 8]}
        opacity={visualQuality === 'low' ? 0.18 : 0.3}
        doubleSide
      />
    </group>
  );
}
