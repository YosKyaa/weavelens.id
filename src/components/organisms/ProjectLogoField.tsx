"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crop, ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setProjectLogo } from "@/app/(portal)/admin/projects/actions";
import { ProjectAvatar, projectLogoUrl } from "@/components/atoms/ProjectAvatar";
import { LogoCropDialog } from "@/components/organisms/LogoCropDialog";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
/** File asli boleh besar: hasil crop selalu PNG 512 px. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** Logo proyek opsional: pilih gambar → atur (crop) → simpan. Bisa diatur ulang kapan saja. */
export function ProjectLogoField({
  projectId,
  title,
  logoPath,
}: {
  projectId: string;
  title: string;
  logoPath: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(logoPath);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function closeCrop() {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function pick(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error("Pakai file PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("Ukuran gambar maksimal 10 MB.");
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  }

  async function saveCropped(blob: Blob) {
    const next = `${projectId}/${crypto.randomUUID()}.png`;
    const { error } = await createBrowserSupabase()
      .storage.from("logos")
      .upload(next, blob, { contentType: "image/png", cacheControl: "31536000" });
    if (error) {
      toast.error("Logo gagal diunggah. Coba lagi.");
      return;
    }
    const result = await setProjectLogo(projectId, next);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPath(next);
    closeCrop();
    toast.success("Logo proyek tersimpan.");
    router.refresh();
  }

  function remove() {
    startTransition(async () => {
      const result = await setProjectLogo(projectId, null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPath(null);
      toast.success("Logo dihapus. Proyek tampil dengan inisial.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProjectAvatar title={title} logoPath={path} size="lg" />
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={TYPES.join(",")}
            className="sr-only"
            id="project-logo"
            onChange={(event) => pick(event.target.files?.[0])}
            disabled={pending}
          />
          <Button asChild variant="outline" size="sm" disabled={pending}>
            <label htmlFor="project-logo" className="cursor-pointer">
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
              {path ? "Ganti logo" : "Unggah logo"}
            </label>
          </Button>
          {path && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCropSrc(projectLogoUrl(path))}
                disabled={pending}
              >
                <Crop aria-hidden />
                Atur ulang
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={pending}
                className="text-danger hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 aria-hidden />
                Hapus
              </Button>
            </>
          )}
        </div>
        <p className="text-xs text-ink/65">
          Opsional. PNG/JPG/WebP; setelah dipilih, logo bisa digeser, diperbesar/diperkecil, dan
          diberi latar transparan atau putih. Tanpa logo, proyek tampil dengan inisial berwarna.
        </p>
      </div>

      <LogoCropDialog src={cropSrc} onCancel={closeCrop} onConfirm={saveCropped} />
    </div>
  );
}
