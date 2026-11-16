/**
 * Aturan frame WeaveLens Booth (SPEC D6), sama dengan FrameValidator + QrGeometry di tablet
 * (repo photoboothWL: app/src/main/java/id/weavelens/booth/imaging/). Bila salah satu diubah, ubah keduanya.
 * Modul murni (tanpa server-only) supaya dipakai editor frame di browser.
 */

export type Layout = "strip" | "4r" | "grid" | "story";

export type Slot = { x: number; y: number; w: number; h: number; fit: "cover"; radius: number };

export type CaptionSide = "bottom" | "left" | "right";

/** Kotak QR tautan galeri yang digambar tablet di cetakan (kolom booth_frames.qr). */
export type QrBox = { x: number; y: number; size: number; caption: boolean; caption_side: CaptionSide };

export type FrameRow = {
  id: string;
  name: string;
  layout: Layout;
  version: number;
  canvas_w: number;
  canvas_h: number;
  slots: Slot[];
  print: { duplicate: number; paper: string };
  png_path: string;
  active_from: string | null;
  active_to: string | null;
  deleted_at: string | null;
  qr: QrBox | null;
};

export type Issue = { blocking: boolean; message: string };

export const SAFE_MARGIN = 36;
export const QR_MIN_SIZE = 180;

export const LAYOUTS: Record<Layout, { label: string; w: number; h: number; slots: [number, number] }> = {
  strip: { label: "Strip (600 × 1800)", w: 600, h: 1800, slots: [3, 4] },
  "4r": { label: "4R (1200 × 1800)", w: 1200, h: 1800, slots: [1, 1] },
  grid: { label: "Grid (1200 × 1800)", w: 1200, h: 1800, slots: [4, 4] },
  story: { label: "Story (1080 × 1920, digital)", w: 1080, h: 1920, slots: [1, 3] },
};

export const LAYOUT_KEYS = Object.keys(LAYOUTS) as Layout[];

export function isLayout(value: string): value is Layout {
  return (LAYOUT_KEYS as string[]).includes(value);
}

/** Strip dicetak dua kolom di satu lembar 4R; layout lain satu kali. */
export const printFor = (layout: Layout) => ({ duplicate: layout === "strip" ? 2 : 1, paper: "4R" });

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Box = { left: number; top: number; right: number; bottom: number };

const slotBox = (s: Slot): Box => ({ left: s.x, top: s.y, right: s.x + s.w, bottom: s.y + s.h });

const insideBox = (b: Box, w: number, h: number, margin: number) =>
  b.right > b.left &&
  b.bottom > b.top &&
  b.left >= margin &&
  b.top >= margin &&
  b.right <= w - margin &&
  b.bottom <= h - margin;

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// ─── QR: angka sama dengan QrGeometry di tablet ────────────────────────────
const QR_REFERENCE = 240;
const QR_TEXT = 22;
const QR_GAP_BELOW = 10;
const QR_GAP_SIDE = 20;
const QR_LINE_HEIGHT = 1.3;
const CHAR_EM = 0.5;
export const QR_CAPTION = "Pindai untuk unduh fotomu";
const QR_CAPTION_LINES = ["Pindai untuk", "unduh fotomu"];

/** Kotak QR + keterangannya (lebar teks diperkirakan), untuk cek kanvas, area aman, dan tumpukan slot. */
export function qrFootprint(qr: QrBox): Box {
  const unit = qr.size / QR_REFERENCE;
  const box = { left: qr.x, top: qr.y, right: qr.x + qr.size, bottom: qr.y + qr.size };
  if (!qr.caption) return box;
  const text = QR_TEXT * unit;
  const estimate = (line: string) => line.length * text * CHAR_EM;
  if (qr.caption_side === "bottom") {
    const width = Math.max(qr.size, estimate(QR_CAPTION));
    const left = qr.x + (qr.size - width) / 2;
    return {
      left: Math.floor(left),
      top: box.top,
      right: Math.ceil(left + width),
      bottom: Math.ceil(box.bottom + QR_GAP_BELOW * unit + text * QR_LINE_HEIGHT),
    };
  }
  const side = Math.max(...QR_CAPTION_LINES.map(estimate)) + QR_GAP_SIDE * unit;
  return qr.caption_side === "left"
    ? { ...box, left: Math.floor(box.left - side) }
    : { ...box, right: Math.ceil(box.right + side) };
}

function qrIssues(qr: QrBox, slots: Slot[], w: number, h: number): Issue[] {
  const issues: Issue[] = [];
  const area = qrFootprint(qr);
  if (qr.size < QR_MIN_SIZE) {
    issues.push({ blocking: true, message: `Kotak QR minimal ${QR_MIN_SIZE} px agar bisa dipindai dari cetakan` });
  } else if (!insideBox(area, w, h, 0)) {
    issues.push({ blocking: true, message: "Kotak QR (dengan keterangannya) keluar dari kanvas" });
  } else if (!insideBox(area, w, h, SAFE_MARGIN)) {
    issues.push({ blocking: false, message: `Kotak QR masuk area aman ${SAFE_MARGIN} px` });
  }
  slots.forEach((slot, i) => {
    if (overlaps(area, slotBox(slot))) {
      issues.push({ blocking: true, message: `Kotak QR menutupi slot ${i + 1}` });
    }
  });
  return issues;
}

export function validate(
  layout: Layout,
  pngW: number,
  pngH: number,
  slots: Slot[],
  id: string,
  qr: QrBox | null = null,
): Issue[] {
  const spec = LAYOUTS[layout];
  const issues: Issue[] = [];
  if (!id) issues.push({ blocking: true, message: "Frame belum punya id" });
  if (pngW !== spec.w || pngH !== spec.h) {
    issues.push({ blocking: true, message: `Ukuran PNG ${pngW}×${pngH}; harus ${spec.w}×${spec.h}` });
  }
  const [min, max] = spec.slots;
  if (slots.length < min || slots.length > max) {
    issues.push({ blocking: true, message: `Jumlah slot harus ${min === max ? min : `${min}–${max}`}` });
  }
  slots.forEach((slot, i) => {
    const box = slotBox(slot);
    if (!insideBox(box, spec.w, spec.h, 0)) {
      issues.push({ blocking: true, message: `Slot ${i + 1} keluar dari kanvas` });
    } else if (!insideBox(box, spec.w, spec.h, SAFE_MARGIN)) {
      issues.push({ blocking: false, message: `Slot ${i + 1} masuk area aman ${SAFE_MARGIN} px` });
    }
    slots.slice(i + 1).forEach((other, j) => {
      if (overlaps(box, slotBox(other))) {
        issues.push({ blocking: true, message: `Slot ${i + 1} & ${i + j + 2} bertumpuk` });
      }
    });
  });
  if (qr) issues.push(...qrIssues(qr, slots, spec.w, spec.h));
  return issues;
}

/** Usulan kotak QR: pojok kanan bawah dengan keterangan di bawah, di dalam area aman. */
export function defaultQr(layout: Layout): QrBox {
  const spec = LAYOUTS[layout];
  const size = layout === "strip" ? 200 : 220;
  return {
    x: spec.w - SAFE_MARGIN - size - 24,
    y: spec.h - SAFE_MARGIN - size - 60,
    size,
    caption: true,
    caption_side: "bottom",
  };
}

const TRANSPARENT_ALPHA = 8;
const GRID = 4;
const MIN_AREA_RATIO = 0.01;
const MIN_FILL_RATIO = 0.6;

/**
 * "Deteksi otomatis": mencari area transparan berbentuk kotak di PNG (alpha ≈ 0) sebagai kandidat slot.
 * Dicari pada grid 4 px agar cepat, lalu tepinya dipertajam pada resolusi penuh.
 * Area yang menyentuh tepi kanvas diabaikan karena itu latar, bukan slot.
 */
export function detectSlots(image: ImageData): Slot[] {
  const cols = Math.floor(image.width / GRID);
  const rows = Math.floor(image.height / GRID);
  const clear = (x: number, y: number) => image.data[(y * image.width + x) * 4 + 3] <= TRANSPARENT_ALPHA;
  const seen = new Uint8Array(cols * rows);
  const found: Slot[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !clear((start % cols) * GRID, Math.floor(start / cols) * GRID)) continue;
    const box = flood(start, cols, rows, seen, (c, r) => clear(c * GRID, r * GRID));
    const touchesEdge = box.minC === 0 || box.minR === 0 || box.maxC === cols - 1 || box.maxR === rows - 1;
    const area = (box.maxC - box.minC + 1) * (box.maxR - box.minR + 1);
    if (touchesEdge || area < cols * rows * MIN_AREA_RATIO || box.count / area < MIN_FILL_RATIO) continue;
    found.push(sharpen(image, box, clear));
  }
  return found.sort((a, b) => a.y - b.y || a.x - b.x);
}

type GridBox = { minC: number; minR: number; maxC: number; maxR: number; count: number };

function flood(
  start: number,
  cols: number,
  rows: number,
  seen: Uint8Array,
  clear: (c: number, r: number) => boolean,
): GridBox {
  const box: GridBox = { minC: cols, minR: rows, maxC: 0, maxR: 0, count: 0 };
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const cell = stack.pop() as number;
    const c = cell % cols;
    const r = Math.floor(cell / cols);
    box.minC = Math.min(box.minC, c);
    box.maxC = Math.max(box.maxC, c);
    box.minR = Math.min(box.minR, r);
    box.maxR = Math.max(box.maxR, r);
    box.count++;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      const next = nr * cols + nc;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen[next] || !clear(nc, nr)) continue;
      seen[next] = 1;
      stack.push(next);
    }
  }
  return box;
}

// Batas pasti: piksel transparan paling luar di sekitar kotak grid (selisih maksimal satu sel grid).
function sharpen(image: ImageData, box: GridBox, clear: (x: number, y: number) => boolean): Slot {
  const x0 = Math.max(0, (box.minC - 1) * GRID);
  const y0 = Math.max(0, (box.minR - 1) * GRID);
  const x1 = Math.min(image.width - 1, (box.maxC + 2) * GRID);
  const y1 = Math.min(image.height - 1, (box.maxR + 2) * GRID);
  let minX = x1;
  let minY = y1;
  let maxX = x0;
  let maxY = y0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!clear(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, fit: "cover", radius: 0 };
}
