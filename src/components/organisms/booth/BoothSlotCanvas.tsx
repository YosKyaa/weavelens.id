"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  detectSlots,
  qrFootprint,
  QR_CAPTION,
  SAFE_MARGIN,
  type Layout,
  type QrBox,
  type Slot,
} from "@/lib/booth/frames";

/** Foto contoh untuk preview (FakeCamera tablet, diperkecil). */
const SAMPLE_URL = "/booth/sample.jpg";
const MIN_SLOT = 40;
const HANDLE = 28;
const PRIMER = "#74342B";
/** Indeks khusus untuk kotak QR di [selected]. */
const QR = -1;

export type FrameDraft = {
  id: string;
  name: string;
  layout: Layout;
  pngUrl: string;
  png: Blob | null;
  pngSize: { w: number; h: number };
  slots: Slot[];
  qr: QrBox | null;
  activeFrom: string;
  activeTo: string;
  isNew: boolean;
};

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // PNG dari bucket publik "frames" dibaca piksel per piksel untuk Deteksi otomatis: butuh CORS.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak bisa dibuka"));
    image.src = url;
  });
}

type Drag =
  | { kind: "create"; x0: number; y0: number }
  | { kind: "move"; index: number; dx: number; dy: number }
  | { kind: "resize"; index: number };

/**
 * Editor slot visual: tarik di area kosong untuk membuat slot, tarik slot (atau kotak QR) untuk memindah,
 * tarik kotak kecil di pojok kanan bawah untuk mengubah ukuran. Koordinat selalu dalam piksel kanvas.
 */
export function BoothSlotCanvas({
  draft,
  onChange,
}: {
  draft: FrameDraft;
  onChange: (next: Partial<FrameDraft>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [png, setPng] = useState<HTMLImageElement | null>(null);
  const [sample, setSample] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghost, setGhost] = useState<Slot | null>(null);

  useEffect(() => {
    loadImage(draft.pngUrl).then(setPng).catch(() => setPng(null));
  }, [draft.pngUrl]);

  useEffect(() => {
    loadImage(SAMPLE_URL).then(setSample).catch(() => setSample(null));
  }, []);

  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context && png) paint(context, png, draft, { selected, preview, sample, ghost });
  }, [png, draft, selected, preview, sample, ghost]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) * canvas.width) / rect.width),
      y: Math.round(((event.clientY - rect.top) * canvas.height) / rect.height),
    };
  };

  const boxOf = (index: number): Slot | null => {
    if (index === QR) {
      return draft.qr ? { x: draft.qr.x, y: draft.qr.y, w: draft.qr.size, h: draft.qr.size, fit: "cover", radius: 0 } : null;
    }
    return draft.slots[index] ?? null;
  };

  function down(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const current = selected === null ? null : boxOf(selected);
    if (current && selected !== null && near(p, current.x + current.w, current.y + current.h)) {
      setDrag({ kind: "resize", index: selected });
      return;
    }
    const inside = (s: Slot | null) => s && p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h;
    if (inside(boxOf(QR))) {
      const qr = boxOf(QR) as Slot;
      setSelected(QR);
      setDrag({ kind: "move", index: QR, dx: p.x - qr.x, dy: p.y - qr.y });
      return;
    }
    const hit = draft.slots.findIndex((s) => inside(s));
    setSelected(hit >= 0 ? hit : null);
    setDrag(
      hit >= 0
        ? { kind: "move", index: hit, dx: p.x - draft.slots[hit].x, dy: p.y - draft.slots[hit].y }
        : { kind: "create", x0: p.x, y0: p.y },
    );
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag) return;
    const p = point(event);
    if (drag.kind === "create") {
      setGhost(rect(drag.x0, drag.y0, p.x, p.y, draft.slots[0]?.radius ?? 0));
      return;
    }
    if (drag.index === QR && draft.qr) {
      onChange({
        qr:
          drag.kind === "move"
            ? { ...draft.qr, x: p.x - drag.dx, y: p.y - drag.dy }
            : { ...draft.qr, size: Math.max(MIN_SLOT, Math.max(p.x - draft.qr.x, p.y - draft.qr.y)) },
      });
      return;
    }
    const slots = [...draft.slots];
    const slot = slots[drag.index];
    slots[drag.index] =
      drag.kind === "move"
        ? { ...slot, x: p.x - drag.dx, y: p.y - drag.dy }
        : { ...slot, w: Math.max(MIN_SLOT, p.x - slot.x), h: Math.max(MIN_SLOT, p.y - slot.y) };
    onChange({ slots });
  }

  function up() {
    if (ghost && ghost.w >= MIN_SLOT && ghost.h >= MIN_SLOT) {
      onChange({ slots: [...draft.slots, ghost] });
      setSelected(draft.slots.length);
    }
    setGhost(null);
    setDrag(null);
  }

  function autoDetect() {
    if (!png) return;
    const scratch = document.createElement("canvas");
    scratch.width = png.naturalWidth;
    scratch.height = png.naturalHeight;
    const context = scratch.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(png, 0, 0);
    const radius = draft.slots[0]?.radius ?? 0;
    onChange({
      slots: detectSlots(context.getImageData(0, 0, scratch.width, scratch.height)).map((s) => ({ ...s, radius })),
    });
    setSelected(null);
  }

  return (
    <div className="grid gap-3">
      <div className="flex justify-center rounded-2xl border border-line bg-sand/40 p-3">
        <canvas
          ref={canvasRef}
          className="max-h-[70dvh] w-auto max-w-full touch-none rounded-md shadow-sm"
          width={draft.pngSize.w}
          height={draft.pngSize.h}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          aria-label="Editor slot frame. Tarik untuk membuat atau memindahkan slot."
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={autoDetect}>
          <ScanSearch aria-hidden />
          Deteksi otomatis
        </Button>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand)]"
            checked={preview}
            onChange={(event) => setPreview(event.target.checked)}
          />
          Preview dengan foto contoh
        </label>
      </div>
      {selected !== null && selected >= 0 && draft.slots[selected] ? (
        <SlotFields
          index={selected}
          slot={draft.slots[selected]}
          onChange={(slot) => onChange({ slots: draft.slots.map((s, i) => (i === selected ? slot : s)) })}
          onRemove={() => {
            onChange({ slots: draft.slots.filter((_, i) => i !== selected) });
            setSelected(null);
          }}
        />
      ) : (
        <p className="text-sm text-ink/70">
          Tarik di area kosong untuk membuat slot. Urutan slot = urutan foto. Kotak QR bisa digeser langsung.
        </p>
      )}
    </div>
  );
}

function SlotFields(props: { index: number; slot: Slot; onChange: (slot: Slot) => void; onRemove: () => void }) {
  const keys = ["x", "y", "w", "h", "radius"] as const;
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-paper p-3">
      <strong className="mr-2 self-center font-heading">Slot {props.index + 1}</strong>
      {keys.map((key) => (
        <label key={key} className="grid gap-1 text-xs font-semibold text-ink/75">
          {key}
          <Input
            type="number"
            className="h-9 w-20"
            value={props.slot[key]}
            onChange={(event) =>
              props.onChange({ ...props.slot, [key]: Math.max(0, Math.trunc(Number(event.target.value) || 0)) })
            }
          />
        </label>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={props.onRemove}>
        Hapus slot
      </Button>
    </div>
  );
}

const near = (p: { x: number; y: number }, x: number, y: number) =>
  Math.abs(p.x - x) <= HANDLE && Math.abs(p.y - y) <= HANDLE;

function rect(x0: number, y0: number, x1: number, y1: number, radius: number): Slot {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), fit: "cover", radius };
}

type PaintOptions = {
  selected: number | null;
  preview: boolean;
  sample: HTMLImageElement | null;
  ghost: Slot | null;
};

// Urutan sama dengan LayoutComposer di tablet: foto di bawah, PNG frame di atas, QR paling atas.
function paint(context: CanvasRenderingContext2D, png: HTMLImageElement, draft: FrameDraft, options: PaintOptions) {
  const { width, height } = context.canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#F2E1D1";
  context.fillRect(0, 0, width, height);
  if (options.preview && options.sample) {
    draft.slots.forEach((slot) => drawCover(context, options.sample as HTMLImageElement, slot));
  }
  context.drawImage(png, 0, 0, width, height);
  if (draft.qr) drawQr(context, draft.qr, options.selected === QR && !options.preview);
  if (options.preview) return;
  context.setLineDash([12, 8]);
  context.strokeStyle = "rgba(116, 52, 43, 0.35)";
  context.lineWidth = 2;
  context.strokeRect(SAFE_MARGIN, SAFE_MARGIN, width - SAFE_MARGIN * 2, height - SAFE_MARGIN * 2);
  context.setLineDash([]);
  [...draft.slots, ...(options.ghost ? [options.ghost] : [])].forEach((slot, index) =>
    outline(context, slot, index, index === options.selected),
  );
}

function outline(context: CanvasRenderingContext2D, slot: Slot, index: number, selected: boolean) {
  context.strokeStyle = PRIMER;
  context.lineWidth = selected ? 6 : 3;
  context.strokeRect(slot.x, slot.y, slot.w, slot.h);
  context.fillStyle = PRIMER;
  context.font = "600 40px sans-serif";
  context.fillText(String(index + 1), slot.x + 12, slot.y + 48);
  if (selected) context.fillRect(slot.x + slot.w - HANDLE / 2, slot.y + slot.h - HANDLE / 2, HANDLE, HANDLE);
}

/** Pengganti visual QR (pola kotak) + keterangan, seukuran yang digambar tablet. */
function drawQr(context: CanvasRenderingContext2D, qr: QrBox, selected: boolean) {
  const unit = qr.size / 240;
  context.save();
  context.fillStyle = "#F9F9F9";
  context.beginPath();
  context.roundRect(qr.x, qr.y, qr.size, qr.size, 8 * unit);
  context.fill();
  const pad = 16 * unit;
  const cells = 21;
  const cell = (qr.size - pad * 2) / cells;
  context.fillStyle = "#2B1A17";
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const finder = (row < 7 || row > 13) && (col < 7 || col > 13) && !(row > 13 && col > 13);
      if (finder ? row % 6 === 0 || col % 6 === 0 || (row % 7 > 1 && row % 7 < 5 && col % 7 > 1 && col % 7 < 5) : (row * 7 + col * 3) % 5 < 2) {
        context.fillRect(qr.x + pad + col * cell, qr.y + pad + row * cell, cell, cell);
      }
    }
  }
  if (qr.caption) {
    context.font = `500 ${Math.round(22 * unit)}px sans-serif`;
    context.fillStyle = "#2B1A17";
    if (qr.caption_side === "bottom") {
      context.textAlign = "center";
      context.fillText(QR_CAPTION, qr.x + qr.size / 2, qr.y + qr.size + 10 * unit + 22 * unit);
    } else {
      context.textAlign = qr.caption_side === "left" ? "right" : "left";
      const x = qr.caption_side === "left" ? qr.x - 20 * unit : qr.x + qr.size + 20 * unit;
      context.fillText("Pindai untuk", x, qr.y + qr.size / 2 - 4 * unit);
      context.fillText("unduh fotomu", x, qr.y + qr.size / 2 + 26 * unit);
    }
  }
  const area = qrFootprint(qr);
  context.setLineDash([8, 6]);
  context.strokeStyle = selected ? PRIMER : "rgba(116, 52, 43, 0.5)";
  context.lineWidth = selected ? 4 : 2;
  context.strokeRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
  context.setLineDash([]);
  if (selected) {
    context.fillStyle = PRIMER;
    context.fillRect(qr.x + qr.size - HANDLE / 2, qr.y + qr.size - HANDLE / 2, HANDLE, HANDLE);
  }
  context.restore();
}

/** fit = cover dengan sudut membulat, seperti di tablet. */
function drawCover(context: CanvasRenderingContext2D, photo: HTMLImageElement, slot: Slot) {
  const scale = Math.max(slot.w / photo.naturalWidth, slot.h / photo.naturalHeight);
  const w = photo.naturalWidth * scale;
  const h = photo.naturalHeight * scale;
  context.save();
  context.beginPath();
  context.roundRect(slot.x, slot.y, slot.w, slot.h, slot.radius);
  context.clip();
  context.drawImage(photo, slot.x + (slot.w - w) / 2, slot.y + (slot.h - h) / 2, w, h);
  context.restore();
}
