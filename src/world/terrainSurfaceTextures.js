import * as THREE from 'three';

const COLOR_DETAIL = new THREE.Color();
const ENCODED_COLOR = new THREE.Color();
const COOL_SOIL = new THREE.Color('#aebbb1');
const MOSS = new THREE.Color('#c2d3bc');
const WARM_EARTH = new THREE.Color('#c8bda4');

function clampByte(value) {
  return Math.round(THREE.MathUtils.clamp(value, 0, 255));
}

function hash2d(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function periodicNoise(u, v, cells, seed) {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = THREE.MathUtils.smoothstep(x - x0, 0, 1);
  const ty = THREE.MathUtils.smoothstep(y - y0, 0, 1);
  const wrap = value => ((value % cells) + cells) % cells;
  const a = hash2d(wrap(x0), wrap(y0), seed);
  const b = hash2d(wrap(x0 + 1), wrap(y0), seed);
  const c = hash2d(wrap(x0), wrap(y0 + 1), seed);
  const d = hash2d(wrap(x0 + 1), wrap(y0 + 1), seed);
  const top = THREE.MathUtils.lerp(a, b, tx);
  const bottom = THREE.MathUtils.lerp(c, d, tx);
  return THREE.MathUtils.lerp(top, bottom, ty);
}

function getSurfaceHeight(u, v) {
  const broad = periodicNoise(u, v, 4, 1);
  const clumps = periodicNoise(u, v, 9, 3);
  const grit = periodicNoise(u, v, 19, 7);
  const grain = Math.sin((u * 5 + v * 2) * Math.PI * 2) * 0.5 + 0.5;
  return broad * 0.44 + clumps * 0.32 + grit * 0.17 + grain * 0.07;
}

function createTexture(data, size, colorSpace = THREE.NoColorSpace) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(22, 22);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export function createTerrainSurfaceTextures(visualQuality = 'balanced') {
  const size = visualQuality === 'high' ? 256 : 128;
  const pixelCount = size * size;
  const heights = new Float32Array(pixelCount);
  const albedoPixels = new Uint8Array(pixelCount * 4);
  const normalPixels = new Uint8Array(pixelCount * 4);
  const roughnessPixels = new Uint8Array(pixelCount * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const u = x / size;
      const v = y / size;
      const height = getSurfaceHeight(u, v);
      const mossBlend = periodicNoise(u, v, 7, 11);
      const earthBlend = periodicNoise(u, v, 5, 17);
      const fleck = hash2d(x, y, 23);
      const luminance = 0.88 + (height - 0.5) * 0.24 + (fleck > 0.955 ? 0.08 : 0);
      heights[index] = height;

      COLOR_DETAIL.copy(COOL_SOIL)
        .lerp(MOSS, THREE.MathUtils.smoothstep(mossBlend, 0.38, 0.78) * 0.48)
        .lerp(WARM_EARTH, THREE.MathUtils.smoothstep(earthBlend, 0.58, 0.9) * 0.28)
        .multiplyScalar(luminance);
      ENCODED_COLOR.copy(COLOR_DETAIL).convertLinearToSRGB();
      const pixelIndex = index * 4;
      albedoPixels[pixelIndex] = clampByte(ENCODED_COLOR.r * 255);
      albedoPixels[pixelIndex + 1] = clampByte(ENCODED_COLOR.g * 255);
      albedoPixels[pixelIndex + 2] = clampByte(ENCODED_COLOR.b * 255);
      albedoPixels[pixelIndex + 3] = 255;

      const roughness = 0.78 + mossBlend * 0.16 - (fleck > 0.97 ? 0.12 : 0);
      const roughnessByte = clampByte(roughness * 255);
      roughnessPixels[pixelIndex] = roughnessByte;
      roughnessPixels[pixelIndex + 1] = roughnessByte;
      roughnessPixels[pixelIndex + 2] = roughnessByte;
      roughnessPixels[pixelIndex + 3] = 255;
    }
  }

  const sampleHeight = (x, y) => heights[((y + size) % size) * size + ((x + size) % size)];
  const normal = new THREE.Vector3();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const dx = sampleHeight(x - 1, y) - sampleHeight(x + 1, y);
      const dy = sampleHeight(x, y - 1) - sampleHeight(x, y + 1);
      normal.set(dx * 2.2, dy * 2.2, 1).normalize();
      normalPixels[index] = clampByte((normal.x * 0.5 + 0.5) * 255);
      normalPixels[index + 1] = clampByte((normal.y * 0.5 + 0.5) * 255);
      normalPixels[index + 2] = clampByte((normal.z * 0.5 + 0.5) * 255);
      normalPixels[index + 3] = 255;
    }
  }

  const map = createTexture(albedoPixels, size, THREE.SRGBColorSpace);
  const normalMap = createTexture(normalPixels, size);
  const roughnessMap = createTexture(roughnessPixels, size);

  return {
    map,
    normalMap,
    roughnessMap,
    dispose() {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
    }
  };
}
