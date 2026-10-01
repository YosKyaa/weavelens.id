"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { setProjectLogo } from "@/app/(portal)/admin/projects/actions";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

/** Logo proyek opsional: tampil di daftar proyek, portal klien, dan link klien. */
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
  const [pending, startTransition] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) {
      toast.error("Pakai file PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ukuran logo maksimal 2 MB.");
      return;
    }
    startTransition(async () => {
      const extension =
        file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const next = `${projectId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await createBrowserSupabase()
        .storage.from("logos")
        .upload(next, file, { contentType: file.type, cacheControl: "31536000" });
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
      toast.success("Logo proyek tersimpan.");
      router.refresh();
    });
    if (inputRef.current) inputRef.current.value = "";
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
            onChange={(event) => upload(event.target.files?.[0])}
            disabled={pending}
          />
          <Button asChild variant="outline" size="sm" disabled={pending}>
            <label htmlFor="project-logo" className="cursor-pointer">
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
              {path ? "Ganti logo" : "Unggah logo"}
            </label>
          </Button>
          {path && (
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
          )}
        </div>
        <p className="text-xs text-ink/65">
          Opsional. PNG/JPG/WebP maks. 2 MB, sebaiknya persegi. Tanpa logo, proyek tampil dengan
          inisial berwarna.
        </p>
      </div>
    </div>
  );
}
