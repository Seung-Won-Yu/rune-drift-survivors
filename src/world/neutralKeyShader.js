export const NEUTRAL_KEY_ALPHA_TEST = 0.14;

const NEUTRAL_KEY_FRAGMENT = `
  vec4 runeSource = sampledDiffuseColor;
  float runeHigh = max(max(runeSource.r, runeSource.g), runeSource.b);
  float runeLow = min(min(runeSource.r, runeSource.g), runeSource.b);
  float runeChroma = runeHigh - runeLow;
  float runeNeutral = 1.0 - smoothstep(0.03, 0.19, runeChroma);
  float runePale = smoothstep(0.52, 0.82, runeLow);
  float runeRawAlpha = 1.0 - runeNeutral * runePale;
  float runeCleanAlpha = smoothstep(0.18, 0.76, runeRawAlpha);
  float runeEdgeStrength = smoothstep(0.3, 0.9, runeRawAlpha);
  diffuseColor.a *= runeCleanAlpha;
  diffuseColor.rgb *= mix(0.38, 1.0, runeEdgeStrength);
`;

export function applyNeutralKeyFragment(shader, tail = '') {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_fragment>',
    `#include <map_fragment>
    #ifdef USE_MAP
      ${NEUTRAL_KEY_FRAGMENT}
      ${tail}
    #endif`
  );
}
