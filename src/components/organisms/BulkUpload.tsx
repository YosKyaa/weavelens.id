"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Files, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  createVersion,
  notifyBulkUpload,
  saveContent,
} from "@/app/(portal)/admin/projects/actions";
import { Field, selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FORMATS, formatLabels, type ContentFormat } from "@/content/workspace";
import {
  DESIGN_ACCEPT,
  MAX_DESIGN_BYTES,
  designKind,
  titleFromFile,
  uploadDesignFile,
} from "@/lib/design-upload";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Row = { file: File; title: string; status: "idle" | "working" | "done" | "failed" };

type BulkUploadProps = {
  projectId: string;
  brands: { id: string; name: string }[];
};

/**
 * Unggah banyak desain sekaligus: tiap file menjadi satu kartu konten (judul dari nama file)
 * dan langsung dikirim ke klien. Klien menerima SATU email ringkasan, bukan satu per desain.
 */
export function BulkUpload({ projectId, brands }: BulkUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [format, setFormat] = useState<ContentFormat>("feed");
  const [pending, startTransition] = useTransition();
  const done = rows.filter((row) => row.status === "done").length;

  function pick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const rejected = picked.filter((file) => !designKind(file) || file.size > MAX_DESIGN_BYTES);
    if (rejected.length) {
      toast.error(`${rejected.length} file dilewati (bukan gambar/PDF/MP4 atau di atas 50 MB).`);
    }
    setRows((current) => [
      ...current,
      ...picked
        .filter((file) => !rejected.includes(file))
        .slice(0, 30 - current.length)
        .map((file) => ({ file, title: titleFromFile(file.name), status: "idle" as const })),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function setRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function submit() {
    startTransition(async () => {
      const supabase = createBrowserSupabase();
      const created: string[] = [];
      for (const [index, row] of rows.entries()) {
        if (row.status === "done") continue;
        setRow(index, { status: "working" });
        const content = await saveContent(projectId, null, {
          title: row.title.trim() || titleFromFile(row.file.name),
          brandId: brandId || null,
          format,
          stage: "in_progress",
          dueDate: "",
          publishDate: "",
          brief: "",
          caption: "",
        });
        const file = content.ok
          ? await uploadDesignFile(supabase, projectId, content.id, row.file)
          : null;
        const version =
          content.ok && file
            ? await createVersion(
                projectId,
                content.id,
                { files: [file], externalUrl: "", note: "" },
                { notifyClient: false },
              )
            : null;
        if (content.ok && version?.ok) {
          created.push(content.id);
          setRow(index, { status: "done" });
        } else {
          setRow(index, { status: "failed" });
        }
      }
      if (created.length) {
        await notifyBulkUpload(projectId, created);
        toast.success(`${created.length} desain dikirim ke klien untuk direview.`);
        router.refresh();
      }
      if (created.length === rows.filter((row) => row.status !== "done").length) {
        setRows([]);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Files aria-hidden />
        Unggah banyak
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (pending) return;
          setOpen(value);
          if (!value) setRows([]);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Unggah banyak desain</DialogTitle>
          <DialogDescription className="text-ink/75">
            Setiap file menjadi satu konten dan langsung masuk &ldquo;Menunggu review&rdquo;. Klien
            menerima satu pemberitahuan untuk semuanya.
          </DialogDescription>

          <div className="grid gap-3 sm:grid-cols-2">
            {brands.length > 0 && (
              <Field id="bulk-brand" label="Brand">
                <select
                  id="bulk-brand"
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
                  className={selectClass}
                  disabled={pending}
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                  <option value="">Tanpa brand</option>
                </select>
              </Field>
            )}
            <Field id="bulk-format" label="Format">
              <select
                id="bulk-format"
                value={format}
                onChange={(event) => setFormat(event.target.value as ContentFormat)}
                className={selectClass}
                disabled={pending}
              >
                {FORMATS.map((value) => (
                  <option key={value} value={value}>
                    {formatLabels[value]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <input
            ref={inputRef}
            id="bulk-files"
            type="file"
            multiple
            accept={DESIGN_ACCEPT}
            onChange={(event) => pick(event.target.files)}
            className="sr-only"
            disabled={pending}
          />
          <label
            htmlFor="bulk-files"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!pending) pick(event.dataTransfer.files);
            }}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/50 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-brand-soft/40"
          >
            <Upload aria-hidden className="size-6 text-primary" />
            <span className="font-heading text-sm font-semibold">
              Pilih atau seret file ke sini
            </span>
            <span className="text-xs text-ink/65">
              Gambar, PDF, atau MP4, maks. 50 MB per file, hingga 30 file.
            </span>
          </label>

          {rows.length > 0 && (
            <ol className="grid gap-2">
              {rows.map((row, index) => (
                <li
                  key={`${row.file.name}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-line bg-paper px-2 py-1.5"
                >
                  <span className="w-6 shrink-0 text-center text-xs text-ink/55">{index + 1}</span>
                  <Input
                    aria-label={`Judul untuk ${row.file.name}`}
                    value={row.title}
                    onChange={(event) => setRow(index, { title: event.target.value })}
                    disabled={pending || row.status === "done"}
                    className="h-9"
                  />
                  <span className="flex w-7 shrink-0 justify-center">
                    {row.status === "working" && (
                      <Loader2
                        aria-label="Mengunggah"
                        className="size-4 animate-spin text-primary"
                      />
                    )}
                    {row.status === "done" && (
                      <CheckCircle2 aria-label="Terkirim" className="size-4 text-success" />
                    )}
                    {row.status === "failed" && (
                      <CircleAlert aria-label="Gagal" className="size-4 text-danger" />
                    )}
                    {row.status === "idle" && !pending && (
                      <button
                        type="button"
                        onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                        aria-label={`Lepas ${row.file.name}`}
                        className="text-ink/55 hover:text-danger"
                      >
                        <X aria-hidden className="size-4" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn("text-sm text-ink/70", !pending && !done && "invisible")}>
              {done} dari {rows.length} terkirim
            </p>
            <Button onClick={submit} disabled={pending || rows.length === 0}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
              {rows.some((row) => row.status === "failed")
                ? "Coba lagi yang gagal"
                : `Kirim ${rows.length || ""} desain`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
