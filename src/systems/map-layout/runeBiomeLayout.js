import { SHRINE_VISUALS } from '../../config/artDirection.js';
import { SHRINE_SITES } from '../../config/gameData.js';
import { getVisualTerrainHeight } from '../terrain.js';

function place(site, radialOffset = 0, lateralOffset = 0, yOffset = 0.05) {
  const radius = site.radius + radialOffset;
  const tangent = site.angle + Math.PI / 2;
  const x = Math.cos(site.angle) * radius + Math.cos(tangent) * lateralOffset;
  const z = Math.sin(site.angle) * radius + Math.sin(tangent) * lateralOffset;
  return [x, getVisualTerrainHeight(x, z) + yOffset, z];
}

export function createRuneBiomeZoneLayout(visualQuality = 'balanced') {
  const detailCount = visualQuality === 'low' ? 2 : 4;
  const zonePatches = SHRINE_SITES.flatMap((site, siteIndex) => {
    const visual = SHRINE_VISUALS[site.id];
    return [
      {
        position: place(site, 2.2, 0),
        rotation: -site.angle + Math.PI / 2,
        scale: [13.5, 9.2, 1],
        color: visual.surface
      },
      {
        position: place(site, 10.5, siteIndex % 2 ? -5.2 : 5.2),
        rotation: -site.angle + Math.PI / 2 + (siteIndex % 2 ? -0.24 : 0.22),
        scale: [9.4, 5.6, 1],
        color: visual.shadow
      },
      {
        position: place(site, -8.5, siteIndex % 2 ? 5.8 : -5.8),
        rotation: -site.angle + Math.PI / 2 + (siteIndex % 2 ? 0.18 : -0.2),
        scale: [7.8, 4.8, 1],
        color: visual.surface
      }
    ];
  });

  const zoneRings = SHRINE_SITES.map(site => ({
    position: place(site, 0, 0, 0.072),
    rotation: -site.angle + Math.PI / 2,
    scale: [9.6, 7.2, 1],
    color: SHRINE_VISUALS[site.id].accent
  }));

  const ruinFragments = SHRINE_SITES.flatMap((site, siteIndex) => (
    Array.from({ length: detailCount }, (_, index) => {
      const side = index % 2 ? -1 : 1;
      return {
        position: place(site, 7 + index * 2.8, side * (7.2 + (index % 3) * 1.6), 0.12),
        rotation: [0.05, -site.angle + Math.PI / 2 + side * (0.24 + index * 0.08), side * 0.06],
        scale: [1.7 + (index % 3) * 0.48, 0.18 + (siteIndex % 2) * 0.06, 0.5 + (index % 2) * 0.16],
        color: index % 2 ? SHRINE_VISUALS[site.id].shadow : SHRINE_VISUALS[site.id].surface
      };
    })
  ));

  const runeShards = SHRINE_SITES.flatMap((site, siteIndex) => (
    Array.from({ length: visualQuality === 'low' ? 1 : 3 }, (_, index) => ({
      position: place(site, 4 + index * 4.5, (index - 1) * 8 + (siteIndex % 2 ? 2 : -2), 0.42),
      rotation: [0.2 + index * 0.08, site.angle + index * 0.72, index % 2 ? -0.18 : 0.16],
      scale: [0.18 + index * 0.04, 0.42 + index * 0.09, 0.18 + index * 0.04],
      color: SHRINE_VISUALS[site.id].accent
    }))
  ));

  return {
    kinds: SHRINE_SITES.map(site => SHRINE_VISUALS[site.id].kind),
    zonePatches,
    zoneRings,
    ruinFragments,
    runeShards
  };
}
