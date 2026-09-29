"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { MEDIA_BUCKET } from "@/lib/supabase/env";

type ImageUploadProps = {
  /** id input file, untuk <label htmlFor>. */
  id: string;
  name: string;
  widthName?: string;
  heightName?: string;
  folder: string;
  initial: { src: string; width: number; height: number } | null;
  required?: boolean;
  describedBy?: string;
  invalid?: boolean;
};

const MAX_EDGE = 1600;

/** Kecilkan ke maks. 1600px dan ubah ke WebP di browser, sama seperti `npm run images:optimize`. */
async function prepare(
  file: File,
): Promise<{ blob: Blob; width: number; height: number; ext: string }> {
  if (file.type === "image/svg+xml") {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    return {
      blob: file,
      width: img.naturalWidth || 400,
      height: img.naturalHeight || 160,
      ext: "svg",
    };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob) throw new Error("Browser tidak bisa mengonversi foto ini.");
  return { blob, width, height, ext: "webp" };
}

export function ImageUpload({
  id,
  name,
  widthName,
  heightName,
  folder,
  initial,
  required,
  describedBy,
  invalid,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, WebP, atau SVG).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { blob, width, height, ext } = await prepare(file);
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const storage = createBrowserSupabase().storage.from(MEDIA_BUCKET);
      const { error: uploadError } = await storage.upload(path, blob, {
        contentType: blob.type || file.type,
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;
      setImage({ src: storage.getPublicUrl(path).data.publicUrl, width, height });
    } catch (cause) {
      console.error(cause);
      setError("Unggah gagal. Pastikan kamu masih login lalu coba lagi.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={image?.src ?? ""} />
      {widthName && <input type="hidden" name={widthName} value={image?.width ?? ""} />}
      {heightName && <input type="hidden" name={heightName} value={image?.height ?? ""} />}

      {image?.src ? (
        <div className="relative w-fit overflow-hidden rounded-xl border border-line bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          <Image
            src={image.src}
            alt=""
            width={image.width || 320}
            height={image.height || 200}
            unoptimized
            className="max-h-56 w-auto object-contain"
          />
        </div>
      ) : (
        <p className="flex h-32 w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted-foreground">
          Belum ada foto
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="sr-only"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
          {busy ? "Mengunggah…" : image?.src ? "Ganti foto" : "Pilih foto"}
        </Button>
        {image?.src && !required && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setImage(null)}>
            <Trash2 aria-hidden />
            Lepas foto
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
