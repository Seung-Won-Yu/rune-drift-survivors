import { useMemo } from 'react';

import { NATURE_MODEL_URLS } from '../config/assets.js';
import { createBalancedNatureAssetTransforms } from '../systems/mapLayout.js';
import { StaticModelInstances } from './StaticModelInstances.jsx';

export function BalancedNatureAssetAccents() {
  const transforms = useMemo(() => createBalancedNatureAssetTransforms(), []);

  return (
    <group>
      <StaticModelInstances url={NATURE_MODEL_URLS.pineTall} transforms={transforms.pineTall} materialColor="#285343" />
      <StaticModelInstances url={NATURE_MODEL_URLS.treeDefault} transforms={transforms.treeDefault} materialColor="#315e4a" />
      <StaticModelInstances url={NATURE_MODEL_URLS.rockLargeA} transforms={transforms.rocks} materialColor="#64736b" />
      <StaticModelInstances url={NATURE_MODEL_URLS.bushLarge} transforms={transforms.bushes} materialColor="#37634f" />
      <StaticModelInstances url={NATURE_MODEL_URLS.grassLarge} transforms={transforms.grass} materialColor="#56765b" />
    </group>
  );
}
