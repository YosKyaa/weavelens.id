"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { markPublished } from "@/app/(portal)/admin/projects/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, todayJakarta } from "@/lib/format";

type PublishPanelProps = {
  projectId: string;
  contentId: string;
  publishedUrl: string | null;
  /** ISO timestamp saat ditandai tayang. */
  publishedAt: string | null;
  /** Tanggal tayang yang direncanakan (isian awal). */
  publishDate: string | null;
};

const jakartaDay = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso));

/** Tandai konten sudah tayang + simpan link postingan; klien melihat link-nya di portal & laporan. */
export function PublishPanel({
  projectId,
  contentId,
  publishedUrl,
  publishedAt,
  publishDate,
}: PublishPanelProps) {
  const router = useRouter();
  const published = Boolean(publishedAt);
  const [editing, setEditing] = useState(!published);
  const [url, setUrl] = useState(publishedUrl ?? "");
  const [date, setDate] = useState(
    publishedAt ? jakartaDay(publishedAt) : (publishDate ?? todayJakarta()),
  );
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(unpublish = false) {
    startTransition(async () => {
      const result = await markPublished(projectId, contentId, { url, date, unpublish });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setError(undefined);
      toast.success(unpublish ? "Tanda tayang dibatalkan." : "Konten ditandai sudah tayang.");
      setEditing(unpublish);
      if (unpublish) setUrl("");
      router.refresh();
    });
  }

  if (published && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-ink/80">
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-success" />
          <span className="min-w-0">
            Tayang {formatDate(jakartaDay(publishedAt!))}
            {publishedUrl && (
              <>
                {" · "}
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 font-medium break-all text-primary underline-offset-4 hover:underline"
                >
                  Lihat postingan
                  <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                </a>
              </>
            )}
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={pending}>
            Ubah
          </Button>
          <Button variant="ghost" size="sm" onClick={() => save(true)} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Undo2 aria-hidden />}
            Batalkan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="grid gap-3"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
        <Field id="publish-url" label="Link postingan (opsional)">
          <Input
            id="publish-url"
            type="url"
            inputMode="url"
            value={url}
            placeholder="https://www.instagram.com/p/…"
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>
        <Field id="publish-date" label="Tanggal tayang">
          <Input
            id="publish-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          {published && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Batal
            </Button>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            {published ? "Simpan" : "Tandai tayang"}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        <p className="text-sm text-ink/70">
          Mis. link Instagram/TikTok. Tahap konten otomatis pindah ke &ldquo;Sudah tayang&rdquo; dan
          klien bisa membuka link-nya dari portal & laporan bulanan.
        </p>
      )}
    </form>
  );
}
