"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteBrandFile, registerBrandFiles } from "@/app/(portal)/admin/clients/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import type { BrandFile } from "@/lib/brand-kit";
import { formatDate } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const MAX_BYTES = 50 * 1024 * 1024;

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Nama aman untuk kunci Storage; nama asli tetap disimpan untuk ditampilkan. */
const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120) || "file";

const randomKey = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/** File aset brand (logo, guideline PDF, font): unggah banyak, unduh, hapus. */
export function BrandFiles({
  clientId,
  brandId,
  files,
  canManage = true,
}: {
  clientId: string;
  brandId: string;
  files: BrandFile[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(list: FileList) {
    const chosen = [...list];
    const tooBig = chosen.filter((file) => file.size > MAX_BYTES);
    if (tooBig.length)
      toast.error(`${tooBig.map((file) => file.name).join(", ")} lebih dari 50 MB.`);
    const valid = chosen.filter((file) => file.size <= MAX_BYTES).slice(0, 30);
    if (valid.length === 0) return;
    const supabase = createBrowserSupabase();
    const uploaded: { path: string; name: string; size: number; contentType: string | null }[] = [];
    for (const [index, file] of valid.entries()) {
      setProgress(`Mengunggah ${index + 1} dari ${valid.length}…`);
      const path = `${brandId}/${randomKey()}/${safeName(file.name)}`;
      const { error } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) {
        toast.error(`${file.name} gagal diunggah.`);
        continue;
      }
      uploaded.push({ path, name: file.name, size: file.size, contentType: file.type || null });
    }
    if (uploaded.length) {
      const result = await registerBrandFiles(clientId, brandId, uploaded);
      if (!result.ok) toast.error(result.error);
      else toast.success(`${uploaded.length} file tersimpan.`);
    }
    setProgress(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={input}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              if (event.target.files?.length) void upload(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={progress !== null}
            onClick={() => input.current?.click()}
          >
            {progress ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
            {progress ?? "Unggah file"}
          </Button>
          <p className="text-sm text-ink/65">
            Logo, guideline PDF, font, foto produk. Maks. 50 MB per file.
          </p>
        </div>
      )}
      {files.length === 0 ? (
        <p className="text-sm text-ink/70">Belum ada file aset.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {files.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText aria-hidden className="size-5 shrink-0 text-ink/50" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
                <span className="block text-xs text-ink/60">
                  {[formatBytes(file.size), formatDate(file.createdAt)].filter(Boolean).join(" · ")}
                </span>
              </span>
              {file.url && (
                <Button asChild variant="ghost" size="icon" aria-label={`Unduh ${file.name}`}>
                  <a href={file.url}>
                    <Download aria-hidden />
                  </a>
                </Button>
              )}
              {canManage && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger hover:bg-danger-soft hover:text-danger"
                      aria-label={`Hapus ${file.name}`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  }
                  title={`Hapus ${file.name}?`}
                  description="File dihapus permanen dari brand kit."
                  confirmLabel="Hapus file"
                  onConfirm={async () => {
                    const result = await deleteBrandFile(clientId, brandId, file.id);
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("File dihapus.");
                    router.refresh();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
