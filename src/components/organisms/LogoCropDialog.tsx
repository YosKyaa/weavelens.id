"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { Loader2, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const OUTPUT = 512;
/** Kotak crop tetap (px di layar), tidak bergantung pada bentuk gambar. */
const CROP = 220;
type Background = "transparent" | "white";

/** Papan catur untuk menandai area transparan. */
const CHECKER = "repeating-conic-gradient(#e9e1da 0% 25%, #ffffff 0% 50%) 50% / 16px 16px";

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  return image;
}

/** Potong sesuai area (boleh melewati tepi gambar = ruang kosong) → PNG persegi 512 px. */
async function renderCrop(src: string, area: Area, background: Background): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT;
  canvas.height = OUTPUT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  if (background === "white") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT, OUTPUT);
  }
  context.imageSmoothingQuality = "high";
  const scale = OUTPUT / area.width;
  context.drawImage(
    image,
    -area.x * scale,
    -area.y * scale,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/png"),
  );
}

type LogoCropDialogProps = {
  /** URL gambar (object URL file baru, atau URL logo yang sudah ada). `null` = tertutup. */
  src: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void>;
};

/**
 * Atur logo sebelum disimpan: geser, perbesar/perkecil (boleh lebih kecil dari kotak untuk
 * memberi ruang), pilih latar transparan atau putih. Hasil: PNG persegi 512 px.
 */
export function LogoCropDialog({ src, onCancel, onConfirm }: LogoCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // "Pas" = seluruh logo terlihat di kotak; "Penuh" = kotak terisi penuh.
  const [fitZoom, setFitZoom] = useState(1);
  const [fillZoom, setFillZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [background, setBackground] = useState<Background>("transparent");
  const [saving, setSaving] = useState(false);

  const minZoom = fitZoom * 0.5;
  const maxZoom = Math.max(fillZoom * 3, 4);

  // Ukuran media di layar pada zoom 1 (object-fit: contain di dalam wadah).
  const onMediaLoaded = useCallback((media: MediaSize) => {
    const fit = CROP / Math.max(media.width, media.height);
    setFitZoom(fit);
    setFillZoom(CROP / Math.min(media.width, media.height));
    setZoom(fit);
    setCrop({ x: 0, y: 0 });
  }, []);

  async function save() {
    if (!src || !area) return;
    setSaving(true);
    try {
      await onConfirm(await renderCrop(src, area, background));
    } finally {
      setSaving(false);
    }
  }

  const step = (delta: number) =>
    setZoom((value) => Math.min(maxZoom, Math.max(minZoom, +(value + delta).toFixed(2))));

  return (
    <Dialog open={src !== null} onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>Atur logo proyek</DialogTitle>
        <DialogDescription className="text-ink/75">
          Geser untuk mengatur posisi, perbesar atau perkecil. Area di dalam kotak yang akan
          dipakai.
        </DialogDescription>

        <div
          className="relative h-72 overflow-hidden rounded-xl border border-line sm:h-80"
          style={{ background: background === "white" ? "#ffffff" : CHECKER }}
        >
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              aspect={1}
              cropSize={{ width: CROP, height: CROP }}
              restrictPosition={false}
              showGrid={false}
              zoomSpeed={0.15}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={onMediaLoaded}
              style={{
                containerStyle: { background: "transparent" },
                cropAreaStyle: { borderRadius: "18%", border: "2px solid #ffffff" },
              }}
            />
          )}
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" onClick={() => step(-0.1)} aria-label="Perkecil">
              <ZoomOut aria-hidden />
            </Button>
            <input
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Ukuran logo"
              className="w-full accent-primary"
            />
            <Button variant="ghost" size="icon-sm" onClick={() => step(0.1)} aria-label="Perbesar">
              <ZoomIn aria-hidden />
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setZoom(fitZoom);
                  setCrop({ x: 0, y: 0 });
                }}
              >
                <Minimize aria-hidden />
                Pas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setZoom(fillZoom);
                  setCrop({ x: 0, y: 0 });
                }}
              >
                <Maximize aria-hidden />
                Penuh
              </Button>
            </div>
            <div
              role="radiogroup"
              aria-label="Latar logo"
              className="inline-flex rounded-lg border border-line bg-paper p-1"
            >
              {(
                [
                  ["transparent", "Transparan"],
                  ["white", "Putih"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={background === value}
                  onClick={() => setBackground(value)}
                  className={cn(
                    "h-8 rounded-md px-3 text-sm font-medium text-ink/70",
                    background === value && "bg-ink text-paper",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Batal
          </Button>
          <Button onClick={save} disabled={saving || !area}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Simpan logo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
