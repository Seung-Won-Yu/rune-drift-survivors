import { useMemo } from 'react';

import { createRuneBiomeZoneLayout } from '../systems/mapLayout.js';
import {
  GroundDecalInstances,
  RelicBoxInstances,
  RelicOctahedronInstances
} from './InstancedGeometry.jsx';

export function RuneBiomeZones({ visualQuality = 'balanced' }) {
  const layout = useMemo(() => createRuneBiomeZoneLayout(visualQuality), [visualQuality]);

  return (
    <group>
      <GroundDecalInstances
        transforms={layout.zonePatches}
        shape="circle"
        segments={visualQuality === 'low' ? 18 : 30}
        opacity={visualQuality === 'low' ? 0.22 : 0.32}
        feathered
      />
      <GroundDecalInstances
        transforms={layout.zoneRings}
        shape="ring"
        ringArgs={[0.76, 0.84, 32]}
        opacity={visualQuality === 'low' ? 0.12 : 0.2}
        doubleSide
      />
      <RelicBoxInstances transforms={layout.ruinFragments} roughness={0.98} />
      <RelicOctahedronInstances transforms={layout.runeShards} opacity={visualQuality === 'low' ? 0.38 : 0.56} />
    </group>
  );
}
