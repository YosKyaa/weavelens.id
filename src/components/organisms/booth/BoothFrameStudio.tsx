"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultQr,
  LAYOUTS,
  LAYOUT_KEYS,
  printFor,
  slugify,
  validate,
  type CaptionSide,
  type FrameRow,
  type Layout,
} from "@/lib/booth/frames";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { NumberField, SelectField, SwitchRow } from "./BoothFields";
import { BoothSlotCanvas, loadImage, type FrameDraft } from "./BoothSlotCanvas";

const BUCKET = "frames";

const CAPTION_SIDES: { value: CaptionSide; label: string }[] = [
  { value: "bottom", label: "Di bawah kotak" },
  { value: "left", label: "Di kiri kotak" },
  { value: "right", label: "Di kanan kotak" },
];

/**
 * Frame booth: unggah PNG, atur slot dan kotak QR, preview dengan foto contoh, simpan sebagai versi baru,
 * hapus lunak. Menulis langsung ke Supabase dengan sesi user (RLS izin "booth").
 * Di tablet: Admin > Tampilan > Sinkronkan frame.
 */
export function BoothFrameStudio({ frames, publicBase }: { frames: FrameRow[]; publicBase: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [draft, setDraft] = useState<FrameDraft | null>(null);
  const publicUrl = (path: string) => `${publicBase}/${path}`;

  async function remove(frame: FrameRow) {
    // Hapus lunak: frame yang pernah dipakai sesi tidak dihapus permanen.
    const { error } = await supabase
      .from("booth_frames")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", frame.id);
    if (error) toast.error("Gagal menghapus frame. Coba lagi.");
    else {
      toast.success(`Frame ${frame.name} dihapus. Tablet menyembunyikannya saat sinkron.`);
      router.refresh();
    }
  }

  if (draft) {
    return (
      <Editor
        draft={draft}
        onChange={(next) => setDraft((current) => (current ? { ...current, ...next } : current))}
        onCancel={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          router.refresh();
        }}
        supabase={supabase}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <UploadButton onReady={setDraft} />
      </div>
      {frames.length === 0 ? (
        <EmptyState message="Belum ada frame. Unggah PNG pertama (template kosong ada di repo booth: templates/blank)." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frames.map((frame) => (
            <article key={frame.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4">
              <div className="flex h-56 items-center justify-center rounded-xl bg-sand/50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- PNG transparan ditampilkan apa adanya */}
                <img src={publicUrl(frame.png_path)} alt={frame.name} className="max-h-full w-auto" />
              </div>
              <div className="flex-1">
                <h2 className="text-base">{frame.name}</h2>
                <p className="text-sm text-ink/75">
                  {LAYOUTS[frame.layout]?.label ?? frame.layout} · versi {frame.version} · {frame.slots.length} slot
                  {frame.qr ? " · QR" : ""}
                </p>
                {(frame.active_from || frame.active_to) && (
                  <p className="text-sm text-ink/70">
                    Aktif {frame.active_from ?? "…"} sampai {frame.active_to ?? "…"}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(toDraft(frame, publicUrl(frame.png_path)))}
                >
                  <Pencil aria-hidden />
                  Ubah
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Trash2 aria-hidden />
                      Hapus
                    </Button>
                  }
                  title={`Hapus frame ${frame.name}?`}
                  description="Frame hilang dari tablet saat Sinkronkan frame berikutnya. Sesi lama tetap tersimpan."
                  confirmLabel="Hapus frame"
                  onConfirm={() => remove(frame)}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function toDraft(frame: FrameRow, pngUrl: string): FrameDraft {
  return {
    id: frame.id,
    name: frame.name,
    layout: frame.layout,
    pngUrl,
    png: null,
    pngSize: { w: frame.canvas_w, h: frame.canvas_h },
    slots: frame.slots,
    qr: frame.qr,
    activeFrom: frame.active_from ?? "",
    activeTo: frame.active_to ?? "",
    isNew: false,
  };
}

function guessLayout(w: number, h: number): Layout {
  return LAYOUT_KEYS.find((key) => LAYOUTS[key].w === w && LAYOUTS[key].h === h) ?? "strip";
}

function UploadButton({ onReady }: { onReady: (draft: FrameDraft) => void }) {
  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.type !== "image/png") {
      toast.error("Frame harus PNG dengan area foto transparan.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = await loadImage(url);
    const layout = guessLayout(image.naturalWidth, image.naturalHeight);
    onReady({
      id: "",
      name: file.name.replace(/\.png$/i, ""),
      layout,
      pngUrl: url,
      png: file,
      pngSize: { w: image.naturalWidth, h: image.naturalHeight },
      slots: [],
      qr: null,
      activeFrom: "",
      activeTo: "",
      isNew: true,
    });
  }
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-within:ring-[3px] focus-within:ring-ring/50">
      <Upload aria-hidden className="size-4" />
      Unggah frame PNG
      <input
        type="file"
        accept="image/png"
        className="sr-only"
        onChange={(event) => void pick(event.target.files?.[0])}
      />
    </label>
  );
}

type Client = ReturnType<typeof createBrowserSupabase>;

function Editor(props: {
  draft: FrameDraft;
  onChange: (next: Partial<FrameDraft>) => void;
  onCancel: () => void;
  onSaved: () => void;
  supabase: Client;
}) {
  const { draft, onChange } = props;
  const [saving, setSaving] = useState(false);
  const id = draft.id || slugify(draft.name);
  const issues = validate(draft.layout, draft.pngSize.w, draft.pngSize.h, draft.slots, id, draft.qr);
  const blocked = issues.some((issue) => issue.blocking);
  const printable = draft.layout !== "story";

  async function save() {
    setSaving(true);
    const message = await saveFrame(props.supabase, { ...draft, id, qr: printable ? draft.qr : null });
    setSaving(false);
    if (message.ok) {
      toast.success(message.text);
      props.onSaved();
    } else {
      toast.error(message.text);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <BoothSlotCanvas draft={draft} onChange={onChange} />
      <aside className="grid content-start gap-4">
        <Field id="frame-name" label="Nama" required>
          <Input id="frame-name" value={draft.name} onChange={(event) => onChange({ name: event.target.value })} />
        </Field>
        <Field id="frame-id" label={`Id ${draft.isNew ? "(otomatis dari nama)" : "(tetap)"}`}>
          <Input
            id="frame-id"
            value={id}
            disabled={!draft.isNew}
            className="font-mono"
            onChange={(event) => onChange({ id: slugify(event.target.value) })}
          />
        </Field>
        <SelectField
          id="frame-layout"
          label="Layout"
          value={draft.layout}
          options={LAYOUT_KEYS.map((key) => ({ value: key, label: LAYOUTS[key].label }))}
          onChange={(layout) => onChange({ layout })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field id="frame-from" label="Aktif mulai">
            <Input
              id="frame-from"
              type="date"
              value={draft.activeFrom}
              onChange={(event) => onChange({ activeFrom: event.target.value })}
            />
          </Field>
          <Field id="frame-to" label="Aktif sampai">
            <Input
              id="frame-to"
              type="date"
              value={draft.activeTo}
              onChange={(event) => onChange({ activeTo: event.target.value })}
            />
          </Field>
        </div>
        {printable && (
          <div className="grid gap-3 rounded-xl border border-line p-3">
            <SwitchRow
              id="frame-qr"
              label="QR galeri di cetakan"
              hint="Tamu memindai cetakan untuk mengunduh fotonya. Minimal 180 px."
              checked={draft.qr !== null}
              onChange={(on) => onChange({ qr: on ? defaultQr(draft.layout) : null })}
            />
            {draft.qr && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    id="qr-x"
                    label="x"
                    value={draft.qr.x}
                    onChange={(x) => draft.qr && onChange({ qr: { ...draft.qr, x } })}
                  />
                  <NumberField
                    id="qr-y"
                    label="y"
                    value={draft.qr.y}
                    onChange={(y) => draft.qr && onChange({ qr: { ...draft.qr, y } })}
                  />
                  <NumberField
                    id="qr-size"
                    label="Ukuran"
                    value={draft.qr.size}
                    min={180}
                    onChange={(size) => draft.qr && onChange({ qr: { ...draft.qr, size } })}
                  />
                </div>
                <SwitchRow
                  id="qr-caption"
                  label="Tulisan “Pindai untuk unduh fotomu”"
                  checked={draft.qr.caption}
                  onChange={(caption) => draft.qr && onChange({ qr: { ...draft.qr, caption } })}
                />
                {draft.qr.caption && (
                  <SelectField
                    id="qr-side"
                    label="Letak tulisan"
                    value={draft.qr.caption_side}
                    options={CAPTION_SIDES}
                    onChange={(side) => draft.qr && onChange({ qr: { ...draft.qr, caption_side: side } })}
                  />
                )}
              </>
            )}
          </div>
        )}
        <ul className="grid gap-1.5 text-sm" aria-live="polite">
          {issues.length === 0 && <li className="font-medium text-success">Frame lolos validasi tablet</li>}
          {issues.map((issue) => (
            <li key={issue.message} className={cn(issue.blocking ? "font-medium text-danger" : "text-ink/75")}>
              {issue.blocking ? "Harus diperbaiki: " : "Peringatan: "}
              {issue.message}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={props.onCancel}>
            Batal
          </Button>
          <Button type="button" disabled={blocked || saving} onClick={save}>
            {saving && <Loader2 aria-hidden className="animate-spin" />}
            {draft.isNew ? "Simpan frame" : "Simpan versi baru"}
          </Button>
        </div>
      </aside>
    </section>
  );
}

/** Setiap simpan = versi baru di path baru, sehingga tablet yang belum sinkron tetap memakai versi lamanya. */
async function saveFrame(supabase: Client, draft: FrameDraft): Promise<{ ok: boolean; text: string }> {
  const { data: existing } = await supabase
    .from("booth_frames")
    .select("version, deleted_at")
    .eq("id", draft.id)
    .maybeSingle();
  if (draft.isNew && existing && !existing.deleted_at) {
    return { ok: false, text: `Id "${draft.id}" sudah dipakai frame lain. Ganti nama atau id.` };
  }
  const version = (existing?.version ?? 0) + 1;
  const path = `${draft.id}/v${version}/frame.png`;
  const png = draft.png ?? (await (await fetch(draft.pngUrl)).blob());
  const upload = await supabase.storage.from(BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
  if (upload.error) return { ok: false, text: `Unggah PNG gagal: ${upload.error.message}` };
  const spec = LAYOUTS[draft.layout];
  const { error } = await supabase.from("booth_frames").upsert({
    id: draft.id,
    name: draft.name.trim() || draft.id,
    layout: draft.layout,
    version,
    canvas_w: spec.w,
    canvas_h: spec.h,
    slots: draft.slots,
    print: printFor(draft.layout),
    png_path: path,
    qr: draft.qr,
    active_from: draft.activeFrom || null,
    active_to: draft.activeTo || null,
    deleted_at: null,
  });
  if (error) return { ok: false, text: `Data frame gagal disimpan: ${error.message}` };
  return { ok: true, text: `Tersimpan: ${draft.name} versi ${version}. Di tablet: Admin > Tampilan > Sinkronkan frame.` };
}
