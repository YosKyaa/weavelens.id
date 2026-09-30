"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  ExternalLink,
  Loader2,
  Lock,
  PlayCircle,
  RefreshCw,
  Send,
  Unlock,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  deliverGallery,
  setGalleryStatus,
  syncGallery,
} from "@/app/(portal)/admin/galleries/actions";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceText } from "@/content/workspace";
import type { GalleryPhoto } from "@/lib/gallery-data";
import { cn } from "@/lib/utils";

const text = workspaceText.galleries;

type GalleryManagerProps = {
  gallery: {
    id: string;
    title: string;
    status: string;
    maxSelection: number | null;
    editedShareUrl: string | null;
    submittedBy: string | null;
    hasFolder: boolean;
  };
  photos: GalleryPhoto[];
  driveReady: boolean;
};

type Filter = "all" | "selected" | "unselected";

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

export function GalleryManager({ gallery, photos, driveReady }: GalleryManagerProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [editedFolder, setEditedFolder] = useState(gallery.editedShareUrl ?? "");
  const [pending, startTransition] = useTransition();

  const selected = photos.filter((photo) => photo.selected);
  const visible =
    filter === "all"
      ? photos
      : photos.filter((photo) => photo.selected === (filter === "selected"));
  const status = gallery.status;

  function sync() {
    startTransition(async () => {
      const result = await syncGallery(gallery.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(text.synced(result.added, result.total));
      if (result.skipped) toast.info(text.syncSkipped(result.skipped));
      router.refresh();
    });
  }

  function changeStatus(next: string, success: string) {
    return async () => {
      const result = await setGalleryStatus(gallery.id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    };
  }

  function downloadList() {
    const content = selected
      .map((photo) => (photo.note ? `${photo.filename}\t${photo.note}` : photo.filename))
      .join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pilihan-${gallery.title.replace(/[^\w-]+/g, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyNames() {
    try {
      await navigator.clipboard.writeText(
        selected.map((photo) => baseName(photo.filename)).join(", "),
      );
      toast.success(text.copiedNames);
    } catch {
      toast.error("Browser menolak menyalin. Pakai Unduh daftar file.");
    }
  }

  const canOpen = (status === "ready" || status === "uploading") && photos.length > 0;

  return (
    <div className="grid gap-6">
      {/* Langkah berikutnya: selalu satu aksi utama yang jelas */}
      <section className="grid gap-4 rounded-2xl border border-line bg-paper p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="photoSet" status={status} />
            <span className="text-sm text-ink/70">
              {text.selectedCount(selected.length, gallery.maxSelection)} · {photos.length} file
              {gallery.submittedBy && ` · dikirim oleh ${gallery.submittedBy}`}
            </span>
          </div>
          <p className="mt-2 text-ink/85">{text.steps[status as keyof typeof text.steps]}</p>
          {!driveReady && <p className="mt-2 text-sm text-danger">{text.driveMissing}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {(status === "uploading" || status === "ready" || status === "selecting") && (
            <Button
              variant={status === "uploading" ? "default" : "outline"}
              onClick={sync}
              disabled={pending || !driveReady || !gallery.hasFolder}
            >
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw aria-hidden />
              )}
              {pending ? text.syncing : text.sync}
            </Button>
          )}
          {canOpen && (
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button>
                  <Unlock aria-hidden />
                  {text.openSelection}
                </Button>
              }
              title={text.openSelection}
              description={text.openSelectionDescription}
              confirmLabel={text.openSelection}
              onConfirm={changeStatus("selecting", text.toast.opened)}
            />
          )}
          {status === "selecting" && (
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button>
                  <Lock aria-hidden />
                  {text.closeSelection}
                </Button>
              }
              title={`${text.closeSelection}?`}
              description="Klien tidak bisa mengubah pilihan lagi. Kamu masih bisa membukanya ulang."
              confirmLabel={text.closeSelection}
              onConfirm={changeStatus("selection_closed", text.toast.closed)}
            />
          )}
          {status === "selection_closed" && (
            <>
              <Button
                variant="outline"
                onClick={() => startTransition(changeStatus("selecting", text.toast.opened))}
              >
                <Unlock aria-hidden />
                {text.reopenSelection}
              </Button>
              <Button onClick={() => startTransition(changeStatus("editing", text.toast.editing))}>
                <Wand2 aria-hidden />
                {text.markEditing}
              </Button>
            </>
          )}
        </div>
      </section>

      {(status === "selection_closed" || status === "editing" || status === "delivered") && (
        <section className="grid gap-4 rounded-2xl border border-line bg-paper p-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadList} disabled={selected.length === 0}>
              <Download aria-hidden />
              {text.downloadList}
            </Button>
            <Button variant="outline" onClick={copyNames} disabled={selected.length === 0}>
              <ClipboardCopy aria-hidden />
              {text.copyNames}
            </Button>
          </div>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
          >
            <Field id="edited-folder" label={text.fields.editedFolder}>
              <Input
                id="edited-folder"
                type="url"
                value={editedFolder}
                placeholder="https://drive.google.com/drive/folders/…"
                onChange={(event) => setEditedFolder(event.target.value)}
              />
            </Field>
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button disabled={!editedFolder.trim()}>
                  <Send aria-hidden />
                  {text.deliver}
                </Button>
              }
              title={`${text.deliver}?`}
              description={text.deliverDescription}
              confirmLabel={text.deliver}
              onConfirm={async () => {
                const result = await deliverGallery(gallery.id, editedFolder);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(text.toast.delivered);
                router.refresh();
              }}
            />
          </form>
          {gallery.editedShareUrl && (
            <a
              href={gallery.editedShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline"
            >
              <ExternalLink aria-hidden className="size-4" />
              Folder hasil edit
            </a>
          )}
        </section>
      )}

      <section aria-labelledby="gallery-files" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="gallery-files" className="text-lg">
            Isi galeri
          </h2>
          <div
            role="tablist"
            aria-label="Filter file"
            className="inline-flex rounded-lg border border-line bg-paper p-1"
          >
            {(Object.keys(text.filters) as Filter[]).map((value) => (
              <button
                key={value}
                role="tab"
                type="button"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-ink/75",
                  filter === value && "bg-ink text-paper",
                )}
              >
                {text.filters[value]}
                <span className="ml-1 opacity-70">
                  {value === "all"
                    ? photos.length
                    : value === "selected"
                      ? selected.length
                      : photos.length - selected.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-paper px-6 py-10 text-center text-ink/70">
            {photos.length === 0 ? text.steps.uploading : "Tidak ada file di filter ini."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((photo) => (
              <li
                key={photo.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-paper [content-visibility:auto]",
                  photo.selected ? "border-primary ring-2 ring-primary" : "border-line",
                )}
              >
                <a
                  href={`https://drive.google.com/file/d/${photo.driveFileId}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative block aspect-[4/3] bg-placeholder"
                >
                  {/* Thumbnail lewat proxy server (cache CDN), ukuran kecil untuk grid */}
                  <span
                    role="img"
                    aria-label={photo.filename}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(/api/drive/thumb/${photo.id}?s=400)` }}
                  />
                  {photo.kind === "video" && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-semibold text-paper">
                      <PlayCircle aria-hidden className="size-3.5" />
                      {text.video}
                    </span>
                  )}
                  {photo.selected && (
                    <span className="absolute top-2 right-2 rounded-full bg-primary p-1 text-primary-foreground">
                      <CheckCircle2 aria-label="Dipilih klien" className="size-4" />
                    </span>
                  )}
                </a>
                <div className="grid gap-0.5 p-2 text-xs">
                  <span className="truncate font-medium text-ink" title={photo.filename}>
                    {photo.filename}
                  </span>
                  {photo.note && (
                    <span className="line-clamp-2 text-ink/75">
                      <span className="font-semibold">{text.noteLabel}:</span> {photo.note}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
