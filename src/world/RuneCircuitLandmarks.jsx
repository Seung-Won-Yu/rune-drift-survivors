import { useMemo } from 'react';

import { createRuneCircuitLandmarkLayout } from '../systems/mapLayout.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';

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
      <RelicBoxInstances transforms={layout.pylons} roughness={0.92} />
      <RelicBoxInstances transforms={layout.lintels} roughness={0.88} />
      <RelicOctahedronInstances transforms={layout.pylonCaps} opacity={0.72} />
      <RelicOctahedronInstances transforms={layout.rankStones} opacity={0.62} />
      <GroundDecalInstances
        transforms={layout.floorRings}
        shape="ring"
        ringArgs={[0.78, 0.88, 8]}
        opacity={visualQuality === 'low' ? 0.18 : 0.3}
        doubleSide
      />
      <GroundDecalInstances
        transforms={layout.routeRunes}
        shape="circle"
        segments={4}
        opacity={visualQuality === 'low' ? 0.11 : 0.18}
        doubleSide
      />
    </group>
  );
}
