import * as THREE from 'three';

// Key the authored neutral backdrop before minification. Keying an already
// filtered texel mixes the checkerboard into armor and makes small sprites sparkle.
const keyedImages = new WeakMap();
const smoothstep = (low, high, value) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
const linearChannels = Float32Array.from({ length: 256 }, (_, value) => (
  value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4
));

export function getSpriteMatteAlpha(red, green, blue, alpha = 255) {
  const high = Math.max(linearChannels[red], linearChannels[green], linearChannels[blue]);
  const low = Math.min(linearChannels[red], linearChannels[green], linearChannels[blue]);
  const neutral = 1 - smoothstep(0.03, 0.19, high - low);
  const pale = smoothstep(0.52, 0.82, low);
  return Math.round(alpha * smoothstep(0.18, 0.76, 1 - neutral * pale));
}

export function createSpriteAtlasTexture(sourceTexture) {
  const source = sourceTexture.image;
  let keyedImage = keyedImages.get(source);
  if (!keyedImage) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      pixels.data[index + 3] = getSpriteMatteAlpha(
        pixels.data[index], pixels.data[index + 1], pixels.data[index + 2], pixels.data[index + 3]
      );
      // Transparent black keeps the white matte out of filtered edge texels.
      if (pixels.data[index + 3] === 0) pixels.data.fill(0, index, index + 3);
    }
    context.putImageData(pixels, 0, 0);
    keyedImage = canvas;
    keyedImages.set(source, keyedImage);
  }

  const texture = new THREE.CanvasTexture(keyedImage);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
