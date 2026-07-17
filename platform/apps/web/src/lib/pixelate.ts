/**
 * pixelate — turn any image into pixel art.
 *
 * Two steps, the classic recipe:
 *   1. DOWNSAMPLE — average each block into one cell (blockify to a low-res grid).
 *   2. QUANTIZE   — reduce the grid to a small palette via median-cut (the flat,
 *      limited-palette look that reads as "pixel art", not just "blurry-small").
 * Then it upscales nearest-neighbor back to the source size for a crisp result.
 *
 * Pure function over ImageData → ImageData, so it works in any canvas context
 * (the /dev/pixelate tool, a build step, or inline in a component).
 */
export type PixelateOptions = {
  /** Source pixels per output cell — bigger = chunkier pixels. */
  pixelSize?: number;
  /** Palette size (median-cut). 0/undefined = keep full colour. */
  colors?: number;
  /** Snap near-transparent cells fully transparent (keeps clean cutout edges). */
  alphaThreshold?: number;
  /** Recolour by luminance along a gradient (hex stops, dark→light). 2+ stops. */
  gradient?: string[];
};

export function pixelate(src: ImageData, opts: PixelateOptions = {}): ImageData {
  const { width, height } = src;
  const ps = Math.max(1, Math.round(opts.pixelSize ?? 8));
  const aT = opts.alphaThreshold ?? 24;
  const cols = Math.max(1, Math.round(width / ps));
  const rows = Math.max(1, Math.round(height / ps));

  // 1. downsample — alpha-weighted average of each block
  const grid = new Uint8ClampedArray(cols * rows * 4);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x0 = Math.floor((gx * width) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * width) / cols));
      const y0 = Math.floor((gy * height) / rows);
      const y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * height) / rows));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * 4;
          const al = src.data[i + 3];
          r += src.data[i] * al;
          g += src.data[i + 1] * al;
          b += src.data[i + 2] * al;
          a += al;
          n++;
        }
      }
      const k = (gy * cols + gx) * 4;
      const meanA = n ? a / n : 0;
      if (a > 0 && meanA >= aT) {
        grid[k] = r / a;
        grid[k + 1] = g / a;
        grid[k + 2] = b / a;
        grid[k + 3] = 255;
      } else {
        grid[k + 3] = 0;
      }
    }
  }

  // 2. quantize the grid to a small palette (median-cut over opaque cells)
  if (opts.colors && opts.colors > 1) quantize(grid, opts.colors);

  // 2b. optional gradient map — recolour each cell by its luminance
  if (opts.gradient && opts.gradient.length >= 2) gradientMap(grid, opts.gradient);

  // 3. upscale nearest-neighbor back to source size (crisp blocks)
  const out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(cols - 1, Math.floor((x * cols) / width));
      const k = (gy * cols + gx) * 4;
      const o = (y * width + x) * 4;
      out[o] = grid[k];
      out[o + 1] = grid[k + 1];
      out[o + 2] = grid[k + 2];
      out[o + 3] = grid[k + 3];
    }
  }
  return new ImageData(out, width, height);
}

/** Return just the small grid (cols×rows) — handy for exporting tight sprites. */
export function pixelateToGrid(src: ImageData, opts: PixelateOptions = {}): ImageData {
  const full = pixelate(src, opts);
  const ps = Math.max(1, Math.round(opts.pixelSize ?? 8));
  const cols = Math.max(1, Math.round(src.width / ps));
  const rows = Math.max(1, Math.round(src.height / ps));
  const grid = new Uint8ClampedArray(cols * rows * 4);
  for (let gy = 0; gy < rows; gy++) {
    const y = Math.floor((gy + 0.5) * (src.height / rows));
    for (let gx = 0; gx < cols; gx++) {
      const x = Math.floor((gx + 0.5) * (src.width / cols));
      const i = (Math.min(src.height - 1, y) * src.width + Math.min(src.width - 1, x)) * 4;
      const o = (gy * cols + gx) * 4;
      grid[o] = full.data[i];
      grid[o + 1] = full.data[i + 1];
      grid[o + 2] = full.data[i + 2];
      grid[o + 3] = full.data[i + 3];
    }
  }
  return new ImageData(grid, cols, rows);
}

/** Map each opaque cell's luminance onto a gradient of hex stops (dark→light). */
function gradientMap(data: Uint8ClampedArray, stops: string[]) {
  const rgb = stops.map(hexToRgb);
  const n = rgb.length;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] === 0) continue;
    const lum = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
    const seg = Math.max(0, Math.min(1, lum)) * (n - 1);
    const i = Math.min(n - 2, Math.floor(seg));
    const f = seg - i;
    const a = rgb[i];
    const b = rgb[i + 1];
    data[p] = Math.round(a[0] + (b[0] - a[0]) * f);
    data[p + 1] = Math.round(a[1] + (b[1] - a[1]) * f);
    data[p + 2] = Math.round(a[2] + (b[2] - a[2]) * f);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const v = parseInt(h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Median-cut colour quantization, in place, on opaque cells of an RGBA grid. */
function quantize(data: Uint8ClampedArray, maxColors: number) {
  const idx: number[] = [];
  for (let p = 0; p < data.length; p += 4) if (data[p + 3] > 0) idx.push(p);
  if (idx.length === 0) return;

  type Box = { pts: number[] };
  let boxes: Box[] = [{ pts: idx }];

  while (boxes.length < maxColors) {
    // split the box with the largest colour range
    let best = -1;
    let bestRange = -1;
    let bestChan = 0;
    for (let bi = 0; bi < boxes.length; bi++) {
      const pts = boxes[bi].pts;
      if (pts.length < 2) continue;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (const p of pts) {
          const v = data[p + c];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
        const range = mx - mn;
        if (range > bestRange) {
          bestRange = range;
          best = bi;
          bestChan = c;
        }
      }
    }
    if (best < 0) break;
    const pts = boxes[best].pts;
    pts.sort((a, b) => data[a + bestChan] - data[b + bestChan]);
    const mid = pts.length >> 1;
    boxes.splice(best, 1, { pts: pts.slice(0, mid) }, { pts: pts.slice(mid) });
  }

  // paint each box its average colour
  for (const box of boxes) {
    if (box.pts.length === 0) continue;
    let r = 0, g = 0, b = 0;
    for (const p of box.pts) {
      r += data[p];
      g += data[p + 1];
      b += data[p + 2];
    }
    const n = box.pts.length;
    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);
    for (const p of box.pts) {
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
    }
  }
}
