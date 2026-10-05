"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectAvatar } from "@/components/atoms/ProjectAvatar";
import { LogoCropDialog } from "@/components/organisms/LogoCropDialog";
import { Button } from "@/components/ui/button";
import { LOGO_SOURCE_TYPES, logoSourceError } from "@/lib/project-logo";

/**
 * Pilih & atur logo SEBELUM proyek dibuat. Hasil crop disimpan di form (belum diunggah);
 * form yang mengunggahnya setelah proyek tersimpan.
 */
export function LogoPicker({
  title,
  value,
  onChange,
  disabled,
}: {
  /** Judul proyek, untuk pratinjau inisial saat belum ada logo. */
  title: string;
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Gambar asli disimpan supaya "Atur ulang" memotong dari kualitas penuh, bukan dari hasil crop.
  const [source, setSource] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );

  function pick(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const problem = logoSourceError(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSource(URL.createObjectURL(file));
    setCropping(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <ProjectAvatar title={title.trim() || "Proyek baru"} previewUrl={preview} size="lg" />
      <div className="grid min-w-56 flex-1 gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id="new-project-logo"
            type="file"
            accept={LOGO_SOURCE_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0])}
            disabled={disabled}
          />
          <Button asChild variant="outline" size="sm" disabled={disabled}>
            <label htmlFor="new-project-logo" className="cursor-pointer">
              <ImageUp aria-hidden />
              {value ? "Ganti logo" : "Pilih logo"}
            </label>
          </Button>
          {value && source && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCropping(true)}
              disabled={disabled}
            >
              <Crop aria-hidden />
              Atur ulang
            </Button>
          )}
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-danger hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 aria-hidden />
              Hapus
            </Button>
          )}
        </div>
        <p className="text-xs text-ink/65">
          Opsional. Bisa digeser, diperbesar/diperkecil, dan diberi latar transparan atau putih.
          Tanpa logo, proyek tampil dengan inisial berwarna.
        </p>
      </div>

      <LogoCropDialog
        src={cropping ? source : null}
        onCancel={() => setCropping(false)}
        onConfirm={async (blob) => {
          onChange(blob);
          setCropping(false);
        }}
      />
    </div>
  );
}
