import * as THREE from 'three';

let cachedTextures = null;

function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function drawMotionTrail(context, width, height) {
  context.clearRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.94)');
  gradient.addColorStop(0.24, 'rgba(255, 255, 255, 0.52)');
  gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(width * 0.5, height * 0.02);
  context.quadraticCurveTo(width * 0.7, height * 0.3, width * 0.78, height * 0.98);
  context.quadraticCurveTo(width * 0.5, height * 0.82, width * 0.22, height * 0.98);
  context.quadraticCurveTo(width * 0.3, height * 0.3, width * 0.5, height * 0.02);
  context.fill();

  const spine = context.createLinearGradient(0, 0, 0, height * 0.74);
  spine.addColorStop(0, 'rgba(255, 255, 255, 0.86)');
  spine.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.strokeStyle = spine;
  context.lineWidth = Math.max(1, width * 0.035);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(width * 0.5, height * 0.05);
  context.lineTo(width * 0.5, height * 0.72);
  context.stroke();
}

function drawStormPulse(context, width, height) {
  context.clearRect(0, 0, width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.48;
  const haze = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  haze.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
  haze.addColorStop(0.2, 'rgba(255, 255, 255, 0.14)');
  haze.addColorStop(0.64, 'rgba(255, 255, 255, 0.055)');
  haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = haze;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  context.lineCap = 'round';
  context.lineWidth = Math.max(1.5, width * 0.012);
  context.setLineDash([width * 0.1, width * 0.07, width * 0.035, width * 0.08]);
  context.beginPath();
  context.arc(0, 0, radius * 0.62, -Math.PI * 0.15, Math.PI * 1.18);
  context.stroke();

  context.globalAlpha = 0.58;
  context.lineWidth = Math.max(1, width * 0.008);
  context.setLineDash([width * 0.045, width * 0.08]);
  context.beginPath();
  context.arc(0, 0, radius * 0.34, Math.PI * 0.18, Math.PI * 1.52);
  context.stroke();

  context.globalAlpha = 0.72;
  context.setLineDash([]);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2 + Math.PI / 4;
    const inner = radius * 0.2;
    const outer = radius * (index % 2 === 0 ? 0.48 : 0.4);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }
  context.restore();
}

export function getCombatEffectTextures() {
  if (cachedTextures) return cachedTextures;
  if (typeof document === 'undefined') return { motionTrail: null, stormPulse: null };

  cachedTextures = Object.freeze({
    motionTrail: createCanvasTexture(64, 128, drawMotionTrail),
    stormPulse: createCanvasTexture(160, 160, drawStormPulse)
  });
  return cachedTextures;
}
