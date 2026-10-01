"use client";

import { useState } from "react";
import { FileText, Film, HardDrive, ImageIcon, Layers } from "lucide-react";
import type { DesignPreview } from "@/lib/design-preview";
import { cn } from "@/lib/utils";

type DesignThumbProps = {
  preview: DesignPreview;
  /** Jumlah file di versi terbaru; >1 = carousel. */
  slides: number;
  emptyLabel: string;
  className?: string;
};

function Placeholder({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-2 px-3 text-center text-xs text-ink/55">
      <Icon aria-hidden className="size-5 shrink-0 text-ink/40" />
      {label}
    </span>
  );
}

/**
 * Pratinjau desain: gambar, frame pertama video, thumbnail Drive, atau ikon (PDF / belum ada).
 * Gagal memuat (mis. link kedaluwarsa) → kembali ke ikon, tidak pernah gambar rusak.
 */
export function DesignThumb({ preview, slides, emptyLabel, className }: DesignThumbProps) {
  const [failed, setFailed] = useState(false);

  let content: React.ReactNode;
  if (preview.kind === "image" && preview.url && !failed) {
    content = (
      // eslint-disable-next-line @next/next/no-img-element -- URL bertanda tangan, tidak lewat optimizer
      <img
        src={preview.url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 size-full object-cover"
      />
    );
  } else if (preview.kind === "video" && preview.url && !failed) {
    content = (
      <>
        <video
          src={`${preview.url}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
        <Film
          aria-hidden
          className="absolute right-2 bottom-2 size-6 rounded-full bg-ink/60 p-1 text-paper"
        />
      </>
    );
  } else if (preview.kind === "drive" && preview.url && !failed) {
    content = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail dari proxy Drive */}
        <img
          src={preview.url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
        <HardDrive
          aria-hidden
          className="absolute right-2 bottom-2 size-6 rounded-full bg-ink/60 p-1 text-paper"
        />
      </>
    );
  } else if (preview.kind === "pdf") {
    content = <Placeholder icon={FileText} label="PDF" />;
  } else if (preview.kind === "drive" || preview.kind === "video") {
    content = (
      <Placeholder
        icon={preview.kind === "drive" ? HardDrive : Film}
        label={preview.kind === "drive" ? "Google Drive" : "Video"}
      />
    );
  } else if (preview.kind === "image") {
    content = <Placeholder icon={ImageIcon} label="Gambar" />;
  } else {
    content = <Placeholder icon={ImageIcon} label={emptyLabel} />;
  }

  return (
    <span className={cn("relative block overflow-hidden bg-placeholder", className)}>
      {content}
      {slides > 1 && (
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-paper">
          <Layers aria-hidden className="size-3" />
          {slides}
        </span>
      )}
    </span>
  );
}
