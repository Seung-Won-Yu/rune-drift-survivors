import { useMemo } from 'react';

import { NATURE_MODEL_URLS } from '../config/assets.js';
import { createBalancedNatureAssetTransforms } from '../systems/mapLayout.js';
import { StaticModelInstances } from './StaticModelInstances.jsx';

export function BalancedNatureAssetAccents() {
  const transforms = useMemo(() => createBalancedNatureAssetTransforms(), []);

  return (
    <group>
      <StaticModelInstances url={NATURE_MODEL_URLS.pineTall} transforms={transforms.pineTall} materialColor="#4f8e61" />
      <StaticModelInstances url={NATURE_MODEL_URLS.treeDefault} transforms={transforms.treeDefault} materialColor="#5a9660" />
      <StaticModelInstances url={NATURE_MODEL_URLS.rockLargeA} transforms={transforms.rocks} materialColor="#7b8563" />
      <StaticModelInstances url={NATURE_MODEL_URLS.bushLarge} transforms={transforms.bushes} materialColor="#6f9a58" />
      <StaticModelInstances url={NATURE_MODEL_URLS.grassLarge} transforms={transforms.grass} materialColor="#8fb768" />
    </group>
  );
}
