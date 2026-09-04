import { SHRINE_VISUALS } from '../../config/artDirection.js';
import { SHRINE_SITES } from '../../config/gameData.js';
import { getVisualTerrainHeight } from '../terrain.js';

export function getRuneCircuitPathPoint(site, siteIndex, progress) {
  const startRadius = 9.6;
  const radius = startRadius + (site.radius - 5.4 - startRadius) * progress;
  const bendDirection = siteIndex % 2 ? -1 : 1;
  const bend = Math.sin(progress * Math.PI) * (2.8 + siteIndex * 0.35) * bendDirection;
  const tangent = site.angle + Math.PI / 2;
  return [
    Math.cos(site.angle) * radius + Math.cos(tangent) * bend,
    Math.sin(site.angle) * radius + Math.sin(tangent) * bend
  ];
}

export function createRuneCircuitPathMarkLayout(visualQuality = 'balanced') {
  const markCount = visualQuality === 'low' ? 2 : visualQuality === 'high' ? 4 : 3;
  return SHRINE_SITES.flatMap((site, siteIndex) => (
    Array.from({ length: markCount }, (_, index) => {
      const progress = (index + 1) / (markCount + 1);
      const [x, z] = getRuneCircuitPathPoint(site, siteIndex, progress);
      return {
        position: [x, getVisualTerrainHeight(x, z) + 0.092, z],
        rotation: site.angle + Math.PI / 4,
        scale: [0.62 + (index % 2) * 0.08, 0.62 + (index % 2) * 0.08, 1],
        color: SHRINE_VISUALS[site.id].accent
      };
    })
  ));
}
