"use client";

import { useEffect, useState, useTransition, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  PlayCircle,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { guestSaveNote, guestSubmitSelection, guestToggleSelection } from "@/app/share/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { shareText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const text = shareText.gallery;

export type SelectablePhoto = {
  id: string;
  filename: string;
  kind: "image" | "video";
  driveFileId: string;
  selected: boolean;
  note: string | null;
};

type PhotoSelectorProps = {
  token: string;
  gallery: {
    id: string;
    title: string;
    status: string;
    maxSelection: number | null;
    deadline: string | null;
    editedShareUrl: string | null;
  };
  photos: SelectablePhoto[];
  canSelect: boolean;
};

type Filter = "all" | "selected" | "unselected";

export function PhotoSelector({
  token,
  gallery,
  photos: initialPhotos,
  canSelect,
}: PhotoSelectorProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();

  const selectedCount = photos.filter((photo) => photo.selected).length;
  const visible =
    filter === "all"
      ? photos
      : photos.filter((photo) => photo.selected === (filter === "selected"));
  const current = open !== null ? visible[open] : null;
  const thumb = (id: string, size: number) => `/api/drive/thumb/${id}?s=${size}&t=${token}`;

  useEffect(() => {
    if (current) setNote(current.note ?? "");
  }, [current]);

  function toggle(photo: SelectablePhoto) {
    if (!canSelect) return;
    const next = !photo.selected;
    if (next && gallery.maxSelection && selectedCount >= gallery.maxSelection) {
      toast.error(text.limitReached(gallery.maxSelection));
      return;
    }
    // Optimistis: langsung berubah di layar, dikembalikan jika server menolak.
    setPhotos((list) =>
      list.map((item) => (item.id === photo.id ? { ...item, selected: next } : item)),
    );
    startTransition(async () => {
      const result = await guestToggleSelection(token, photo.id, next);
      if (!result.ok) {
        setPhotos((list) =>
          list.map((item) => (item.id === photo.id ? { ...item, selected: !next } : item)),
        );
        toast.error(result.error);
      }
    });
  }

  function saveNote() {
    if (!current) return;
    startSaving(async () => {
      const result = await guestSaveNote(token, current.id, note);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPhotos((list) =>
        list.map((item) => (item.id === current.id ? { ...item, note: note || null } : item)),
      );
      toast.success(text.noteSaved);
    });
  }

  function step(delta: number) {
    setOpen((index) =>
      index === null ? index : (index + delta + visible.length) % visible.length,
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === " " && current) {
      event.preventDefault();
      toggle(current);
    }
  }

  return (
    <div className="grid gap-5 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">{gallery.title}</h2>
          <p className="mt-1 text-sm text-ink/75">
            {text.statusHint[gallery.status] ?? ""}
            {gallery.deadline &&
              gallery.status === "selecting" &&
              ` ${text.deadline(formatDate(gallery.deadline))}.`}
          </p>
        </div>
        {gallery.status === "delivered" && gallery.editedShareUrl && (
          <Button asChild size="lg">
            <a href={gallery.editedShareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden />
              {text.downloadEdited}
            </a>
          </Button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Filter"
        className="inline-flex w-fit rounded-lg border border-line bg-paper p-1"
      >
        {(Object.keys(text.filters) as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => {
              setFilter(value);
              setOpen(null);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-ink/75",
              filter === value && "bg-ink text-paper",
            )}
          >
            {text.filters[value]}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((photo, index) => (
          <li
            key={photo.id}
            className={cn(
              "relative overflow-hidden rounded-xl bg-placeholder [content-visibility:auto] [contain-intrinsic-size:200px]",
              photo.selected && "ring-3 ring-primary",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`${photo.filename}${photo.selected ? `, ${text.selected}` : ""}`}
              className="relative block aspect-[4/3] w-full"
            >
              <Image
                src={thumb(photo.id, 400)}
                alt=""
                fill
                sizes="(min-width: 1280px) 20vw, (min-width: 640px) 33vw, 50vw"
                unoptimized
                className="object-cover"
              />
              {photo.kind === "video" && (
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-semibold text-paper">
                  <PlayCircle aria-hidden className="size-3.5" />
                  Video
                </span>
              )}
            </button>
            {canSelect && (
              <button
                type="button"
                onClick={() => toggle(photo)}
                aria-pressed={photo.selected}
                aria-label={`${photo.selected ? "Batalkan pilihan" : text.select} ${photo.filename}`}
                className={cn(
                  "absolute top-2 right-2 flex size-10 items-center justify-center rounded-full border-2 border-paper shadow-lift transition-colors",
                  photo.selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-ink/35 text-paper hover:bg-ink/60",
                )}
              >
                <Check aria-hidden className="size-5" />
              </button>
            )}
            {!canSelect && photo.selected && (
              <span className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check aria-label={text.selected} className="size-4" />
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* Penghitung selalu terlihat di bawah layar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="font-heading font-semibold tabular-nums" aria-live="polite">
            {text.counter(selectedCount, gallery.maxSelection)}
          </p>
          {canSelect && (
            <ConfirmDialog
              tone="primary"
              trigger={
                <Button size="lg" disabled={selectedCount === 0}>
                  <Send aria-hidden />
                  {text.submit}
                </Button>
              }
              title={text.submitTitle(selectedCount)}
              description={text.submitDescription}
              confirmLabel={text.submit}
              onConfirm={async () => {
                const result = await guestSubmitSelection(token, gallery.id);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(text.submitted);
                router.refresh();
              }}
            />
          )}
        </div>
      </div>

      <Dialog open={current !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent
          showCloseButton={false}
          onKeyDown={onKey}
          className="max-h-[95dvh] gap-0 overflow-y-auto border-none bg-ink p-0 text-paper sm:max-w-5xl"
        >
          {current && open !== null && (
            <>
              <DialogTitle className="sr-only">{current.filename}</DialogTitle>
              <DialogDescription className="sr-only">{text.keyboardHint}</DialogDescription>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate">
                  {open + 1} / {visible.length} · {current.filename}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="inline-flex size-10 items-center justify-center rounded-full hover:bg-paper/10"
                >
                  <X aria-hidden className="size-5" />
                  <span className="sr-only">{text.close}</span>
                </button>
              </div>
              <div className="relative flex items-center justify-center bg-black">
                {current.kind === "video" ? (
                  <iframe
                    key={current.id}
                    src={`https://drive.google.com/file/d/${current.driveFileId}/preview`}
                    title={text.play}
                    allow="autoplay; fullscreen"
                    className="aspect-video w-full"
                  />
                ) : (
                  <Image
                    key={current.id}
                    src={thumb(current.id, 1600)}
                    alt={current.filename}
                    width={1600}
                    height={1067}
                    unoptimized
                    className="h-auto max-h-[65dvh] w-auto object-contain"
                  />
                )}
                {visible.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 hover:bg-ink/80"
                    >
                      <ChevronLeft aria-hidden className="size-5" />
                      <span className="sr-only">{text.previous}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 hover:bg-ink/80"
                    >
                      <ChevronRight aria-hidden className="size-5" />
                      <span className="sr-only">{text.next}</span>
                    </button>
                  </>
                )}
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                {canSelect && (
                  <Button
                    size="lg"
                    onClick={() => toggle(current)}
                    className={cn(current.selected ? "bg-paper text-primary hover:bg-sand" : "")}
                    aria-pressed={current.selected}
                  >
                    <Check aria-hidden />
                    {current.selected ? text.selected : text.select}
                  </Button>
                )}
                {canSelect && current.selected && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveNote();
                    }}
                    className="grid gap-2"
                  >
                    <label htmlFor="photo-note" className="text-sm font-semibold">
                      {text.note}
                    </label>
                    <Textarea
                      id="photo-note"
                      rows={2}
                      value={note}
                      placeholder={text.notePlaceholder}
                      onChange={(event) => setNote(event.target.value)}
                      className="bg-paper text-ink"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="w-fit text-ink"
                      disabled={saving}
                    >
                      {saving && <Loader2 className="animate-spin" aria-hidden />}
                      Simpan catatan
                    </Button>
                  </form>
                )}
                {!canSelect && current.note && (
                  <p className="text-sm text-paper/85">
                    {text.note}: {current.note}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
