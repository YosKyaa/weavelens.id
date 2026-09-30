"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { createVersion } from "@/app/(portal)/admin/projects/actions";
import { Field } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { workspaceText } from "@/content/workspace";
import { DESIGN_BUCKET, type DesignFile } from "@/lib/design-files";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const text = workspaceText.content.versions;
const MAX_BYTES = 50 * 1024 * 1024;

function kindOf(file: File): DesignFile["kind"] | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "video/mp4" || file.type === "video/quicktime") return "video";
  return null;
}

async function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return {};
  }
}

/** Unggah versi baru: file langsung dari browser ke Storage, lalu versi dicatat & dikirim ke klien. */
export function VersionUploader({
  projectId,
  contentId,
}: {
  projectId: string;
  contentId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [externalUrl, setExternalUrl] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(list: FileList | null) {
    const picked = Array.from(list ?? []);
    for (const file of picked) {
      if (!kindOf(file)) {
        toast.error(text.badType(file.name));
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(text.tooLarge(file.name));
        return;
      }
    }
    setFiles(picked);
  }

  function submit() {
    if (files.length === 0 && !externalUrl.trim()) {
      toast.error(text.needFile);
      return;
    }
    startTransition(async () => {
      const storage = createBrowserSupabase().storage.from(DESIGN_BUCKET);
      const uploaded: DesignFile[] = [];
      for (const [index, file] of files.entries()) {
        setProgress(text.uploading(index + 1, files.length));
        const kind = kindOf(file)!;
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${projectId}/${contentId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await storage.upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
        });
        if (error) {
          setProgress(null);
          toast.error(`Gagal mengunggah ${file.name}. Coba lagi.`);
          return;
        }
        uploaded.push({
          path,
          kind,
          name: file.name,
          ...(kind === "image" ? await imageSize(file) : {}),
        });
      }
      setProgress(null);

      const result = await createVersion(projectId, contentId, {
        files: uploaded,
        externalUrl,
        note,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(text.sent(result.versionNo));
      setFiles([]);
      setExternalUrl("");
      setNote("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="grid gap-4"
    >
      <div className="grid gap-2">
        <input
          ref={inputRef}
          id="version-files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime"
          onChange={(event) => pick(event.target.files)}
          className="sr-only"
        />
        <label
          htmlFor="version-files"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/50 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-brand-soft/40"
        >
          <FileUp aria-hidden className="size-6 text-primary" />
          <span className="font-heading text-sm font-semibold">{text.upload}</span>
          <span className="text-xs text-ink/65">{text.uploadHint}</span>
        </label>
        {files.length > 0 && (
          <ol className="grid gap-1 text-sm">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-1.5"
              >
                <span className="truncate">
                  {index + 1}. {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}
                  aria-label={`Lepas ${file.name}`}
                  className="shrink-0 text-ink/60 hover:text-danger"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <Field id="version-link" label={text.externalLabel}>
        <Input
          id="version-link"
          type="url"
          value={externalUrl}
          placeholder="https://drive.google.com/file/d/…"
          onChange={(event) => setExternalUrl(event.target.value)}
        />
      </Field>
      <Field id="version-note" label={text.note}>
        <Textarea
          id="version-note"
          rows={2}
          value={note}
          placeholder={text.notePlaceholder}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {progress ?? text.submit}
      </Button>
    </form>
  );
}
