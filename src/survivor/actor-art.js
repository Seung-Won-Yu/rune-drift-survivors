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
  ember: { scale: 0.44, pivot: 138, rects: [
    [39,15,197,236],[287,14,199,239],[534,15,199,237],[791,15,198,238],
    [40,267,200,239],[287,267,200,240],[541,266,199,239],[794,269,196,237],
    [21,523,227,238],[290,530,218,227],[546,523,202,237],[802,522,196,239],
    [27,780,241,231],[287,780,197,231],[545,781,205,230],[797,773,198,238],
    [20,1035,200,227],[255,1035,230,229],[545,1035,204,230],[791,1028,200,239],
    [43,1277,208,230],[293,1289,221,217],[512,1328,244,177],[752,1364,258,146]
  ] },
  grove: { scale: 0.4, pivot: 152, rects: [
    [76,14,158,260],[324,14,153,259],[572,13,148,260],[822,14,149,260],
    [78,285,159,256],[319,284,154,260],[568,284,157,261],[823,284,150,260],
    [41,556,236,245],[309,561,212,241],[576,557,160,244],[825,556,155,247],
    [42,811,190,242],[274,822,235,234],[558,813,185,241],[820,815,163,242],
    [49,1070,184,238],[297,1072,195,236],[558,1087,179,222],[825,1071,155,244],
    [37,1323,181,189],[297,1334,174,180],[506,1382,246,126],[764,1404,251,115]
  ] },
  boss: { scale: .69, pivot: 150, rects: [
    [18,13,210,235],[265,13,221,236],[521,9,201,241],[778,9,211,240],
    [15,325,241,173],[270,260,231,248],[519,296,239,204],[767,309,252,191],
    [13,548,249,190],[261,529,260,213],[525,537,238,213],[780,513,209,238],
    [27,759,191,250],[263,769,231,239],[492,769,297,238],[782,765,209,242],
    [14,1024,209,239],[258,1038,231,227],[525,1028,217,238],[775,1033,223,233],
    [9,1272,228,234],[267,1303,233,201],[489,1385,263,116],[753,1399,267,100]
  ], cuts: {
    // Empty corners contain tiny fragments of adjacent paintings. Exclude
    // these measured regions only in the cached extraction; keep the source.
    14: [[782,947,8,20]], 15: [[782,855,8,57]],
    21: [[489,1473,12,16]], 22: [[489,1385,11,20]]
  } },
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
    // Never enlarge a painted source into its cache: extra pixels add memory,
    // not detail. Small enemy frames retain the existing 3x world resolution.
    const density = Math.min(3, 1 / scale);
    const canvas = document.createElement('canvas');
    const width = w * scale, height = h * scale, border = ['ash', 'ember', 'grove'].includes(key) ? 3 : 0;
    canvas.width = Math.ceil((width + border * 2) * density);
    canvas.height = Math.ceil((height + border * 2) * density);
    const ink = canvas.getContext('2d'); ink.scale(density, density); ink.imageSmoothingQuality = 'high';
    if (border) {
      for (const [radius, color] of [[3, '#10251f'], [1.1, '#f2dcb0']]) {
        const mask = document.createElement('canvas'); mask.width = canvas.width; mask.height = canvas.height;
        const edge = mask.getContext('2d'); edge.scale(density, density);
        for (let i = 0; i < 8; i++) edge.drawImage(images[key], x, y, w, h,
          border + Math.cos(i * Math.PI / 4) * radius, border + Math.sin(i * Math.PI / 4) * radius, width, height);
        edge.globalCompositeOperation = 'source-in'; edge.fillStyle = color; edge.fillRect(0, 0, canvas.width, canvas.height);
        ink.drawImage(mask, 0, 0, mask.width / density, mask.height / density);
      }
    }
    ink.drawImage(images[key], x, y, w, h, border, border, width, height);
    for (const [left, top, width, height] of meta.cuts?.[index] ?? []) {
      ink.clearRect(border + (left - x) * scale, border + (top - y) * scale, width * scale, height * scale);
    }
    const bright = document.createElement('canvas'); bright.width = canvas.width; bright.height = canvas.height;
    const tint = bright.getContext('2d'); tint.filter = 'brightness(1.65)'; tint.drawImage(canvas, 0, 0);
    const lift = key === 'hound' && index === 11 ? 18 : key === 'hound' && index === 12 ? 26 : 0;
    const result = { canvas, bright, density, x: (x - (index % 4 * 256 + meta.pivot)) * scale - border,
      y: -(h + lift) * scale - border };
    frames.set(id, result); return result;
  }
  // Build after image loading, while the departure screen is still preparing.
  // First hits and defeats must not allocate/tint canvases in the combat loop.
  for (const key of Object.keys(images)) for (let index = 0; index < 24; index++) {
    if (key === 'ash' && (index === 12 || index === 13)) continue;
    frame(key, index);
  }
  const draw = function(ctx, key, index, x, y, { flip = false, flash = false, factor = 1, pose = {} } = {}) {
    const f = frame(key, index);
    ctx.save(); ctx.translate(x + (pose.x || 0), y + (pose.y || 0));
    ctx.scale((flip ? -1 : 1) * factor, factor);
    // Keep the painted limbs intact. A small, foot-anchored weight shift joins
    // the release/hit pose to its contact; never stretch the whole illustration.
    ctx.rotate(Math.max(-.06, Math.min(.06, pose.tilt || 0)));
    ctx.scale(Math.max(.94, Math.min(1.06, pose.sx ?? 1)), Math.max(.94, Math.min(1.06, pose.sy ?? 1)));
    ctx.drawImage(flash ? f.bright : f.canvas, f.x, f.y, f.canvas.width / f.density, f.canvas.height / f.density);
    ctx.restore();
  };
  // Nominal RGBA backing size of the retained normal/hit pose canvases.
  // This excludes decoded atlases, temporary masks and browser GPU copies.
  draw.cacheBytes = [...frames.values()].reduce((sum, f) => sum + (f.canvas.width * f.canvas.height + f.bright.width * f.bright.height) * 4, 0);
  return draw;
}
