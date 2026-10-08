// Measured alpha-component rectangles. These paintings are not uniform grids.
// Keep source scale constant through crouches, jumps and collapse.
export const ACTOR_ART = {
  ash: { scale: .43, pivot: 126, rects: [
    [13,21,236,239],[273,28,223,233],[531,20,223,242],[774,15,234,244],
    [12,279,236,238],[271,284,227,234],[531,281,222,237],[769,272,238,246],
    [14,534,241,236],[284,538,200,232],[519,524,225,249],[767,554,251,216],
    [12,796,280,226],[267,786,252,236],[523,791,231,231],[776,785,232,238],
    [27,1029,212,245],[268,1035,229,240],[523,1046,219,218],[769,1036,240,237],
    [10,1287,205,225],[266,1308,220,201],[513,1328,233,177],[759,1369,258,143]
  ] },
  hound: { scale: .27, pivot: 128, rects: [
    [11,79,236,172],[267,86,244,166],[529,82,231,169],[784,82,222,162],
    [14,316,237,171],[276,324,233,162],[522,319,235,168],[775,319,240,166],
    [11,580,241,151],[259,601,247,131],[519,601,237,130],[767,550,243,164],
    [15,792,257,144],[279,821,225,156],[519,834,240,141],[776,801,231,173],
    [15,1058,219,167],[266,1036,217,184],[523,1071,226,153],[775,1052,235,173],
    [13,1320,236,152],[275,1334,236,137],[522,1363,228,110],[769,1378,240,90]
  ] },
  giant: { scale: .29, pivot: 128, rects: [
    [14,34,243,219],[283,37,230,219],[538,32,229,225],[791,36,220,221],
    [29,275,227,236],[283,287,224,223],[532,289,237,218],[798,281,226,227],
    [26,568,232,213],[292,542,196,233],[529,522,205,259],[781,577,219,205],
    [18,878,236,145],[272,862,268,163],[557,805,208,224],[788,807,232,225],
    [23,1048,238,230],[265,1037,244,240],[544,1073,228,204],[795,1067,227,215],
    [16,1293,233,209],[264,1314,236,186],[506,1356,249,146],[763,1392,248,107]
  ] }
};

export function createActorPainter(images) {
  const frames = new Map();
  function frame(key, index) {
    const id = `${key}:${index}`;
    if (frames.has(id)) return frames.get(id);
    const meta = ACTOR_ART[key], [x, y, w, h] = meta.rects[index], scale = meta.scale;
    const canvas = document.createElement('canvas');
    const width = w * scale, height = h * scale, border = key === 'ash' ? 3 : 0;
    canvas.width = Math.ceil((width + border * 2) * 3);
    canvas.height = Math.ceil((height + border * 2) * 3);
    const ink = canvas.getContext('2d'); ink.scale(3, 3); ink.imageSmoothingQuality = 'high';
    if (border) {
      for (const [radius, color] of [[3, '#10251f'], [1.1, '#f2dcb0']]) {
        const mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
        const edge = mask.getContext('2d'); edge.scale(3, 3);
        for (let i = 0; i < 8; i++) edge.drawImage(images[key], x, y, w, h,
          border + Math.cos(i * Math.PI / 4) * radius, border + Math.sin(i * Math.PI / 4) * radius, width, height);
        edge.globalCompositeOperation = 'source-in'; edge.fillStyle = color; edge.fillRect(0, 0, canvas.width, canvas.height);
        ink.drawImage(mask, 0, 0, mask.width / 3, mask.height / 3);
      }
    }
    ink.drawImage(images[key], x, y, w, h, border, border, width, height);
    const bright = document.createElement('canvas'); bright.width = canvas.width; bright.height = canvas.height;
    const tint = bright.getContext('2d'); tint.filter = 'brightness(1.65)'; tint.drawImage(canvas, 0, 0);
    const lift = key === 'hound' && index === 11 ? 18 : key === 'hound' && index === 12 ? 26 : 0;
    const result = { canvas, bright, x: (x - (index % 4 * 256 + meta.pivot)) * scale - border,
      y: -(h + lift) * scale - border };
    frames.set(id, result); return result;
  }
  // Build after image loading, while the departure screen is still preparing.
  // First hits and defeats must not allocate/tint canvases in the combat loop.
  for (const key of Object.keys(images)) for (let index = 0; index < 24; index++) {
    if (key === 'ash' && (index === 12 || index === 13)) continue;
    frame(key, index);
  }
  return function draw(ctx, key, index, x, y, { flip = false, flash = false, factor = 1, pose = {} } = {}) {
    const f = frame(key, index);
    ctx.save(); ctx.translate(x + (pose.x || 0), y + (pose.y || 0));
    ctx.scale((flip ? -1 : 1) * factor, factor);
    // Authored limb movement supplies the pose; only directional recoil remains.
    ctx.drawImage(flash ? f.bright : f.canvas, f.x, f.y, f.canvas.width / 3, f.canvas.height / 3);
    ctx.restore();
  };
}
