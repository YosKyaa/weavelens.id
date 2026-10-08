import Link from "next/link";
import { Download, ExternalLink, Palette } from "lucide-react";
import type { BrandKit } from "@/lib/brand-kit";

/**
 * Brand kit di papan proyek (hanya baca): warna, font, gaya bahasa, panduan, dan file aset —
 * supaya desainer tidak perlu bertanya ulang. Tertutup secara bawaan agar papan tetap lega.
 */
export function BrandKitPanel({
  kits,
  manageHref,
}: {
  kits: BrandKit[];
  /** Link ke halaman edit (hanya untuk yang punya izin Klien & brand). */
  manageHref?: (brandId: string) => string;
}) {
  if (kits.length === 0) return null;
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2">
      {kits.map((kit) => (
        <details key={kit.id} className="group rounded-xl border border-line bg-paper">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <Palette aria-hidden className="size-4 text-ink/60" />
            <span className="min-w-0 truncate font-heading font-semibold">
              Brand kit {kit.name}
            </span>
            <span aria-hidden className="hidden shrink-0 -space-x-1 sm:flex">
              {kit.palette.slice(0, 6).map((color) => (
                <span
                  key={color}
                  className="size-4 rounded-full border border-paper"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="ml-auto shrink-0 text-sm text-ink/60 group-open:hidden">Lihat</span>
            <span className="ml-auto hidden shrink-0 text-sm text-ink/60 group-open:inline">
              Tutup
            </span>
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-line px-4 py-4 text-sm break-words md:grid-cols-2">
            {kit.palette.length > 0 && (
              <div>
                <p className="mb-2 font-semibold text-ink">Warna</p>
                <ul className="flex flex-wrap gap-2">
                  {kit.palette.map((color) => (
                    <li key={color} className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-6 rounded-md border border-line"
                        style={{ backgroundColor: color }}
                      />
                      <code className="text-xs">{color}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {kit.fonts && (
              <div>
                <p className="mb-1 font-semibold text-ink">Font</p>
                <p className="text-ink/80">{kit.fonts}</p>
              </div>
            )}
            {kit.voice && (
              <div>
                <p className="mb-1 font-semibold text-ink">Gaya bahasa</p>
                <p className="whitespace-pre-line text-ink/80">{kit.voice}</p>
              </div>
            )}
            {kit.guideline && (
              <div className="md:col-span-2">
                <p className="mb-1 font-semibold text-ink">Panduan</p>
                <p className="whitespace-pre-line text-ink/80">{kit.guideline}</p>
              </div>
            )}
            {(kit.files.length > 0 || kit.assetUrl) && (
              <div className="md:col-span-2">
                <p className="mb-2 font-semibold text-ink">File aset</p>
                <ul className="flex flex-wrap gap-2">
                  {kit.assetUrl && (
                    <li>
                      <a
                        href={kit.assetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 hover:border-ink"
                      >
                        <ExternalLink aria-hidden className="size-3.5" />
                        Folder aset
                      </a>
                    </li>
                  )}
                  {kit.files.map(
                    (file) =>
                      file.url && (
                        <li key={file.id}>
                          <a
                            href={file.url}
                            className="inline-flex max-w-64 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 hover:border-ink"
                          >
                            <Download aria-hidden className="size-3.5 shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </a>
                        </li>
                      ),
                  )}
                </ul>
              </div>
            )}
            {manageHref && (
              <p className="md:col-span-2">
                <Link
                  href={manageHref(kit.id)}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ubah brand kit
                </Link>
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
