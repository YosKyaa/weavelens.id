"use client";

import Link from "next/link";
import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ContentShareLink = { id: string; token: string; label: string };

type ContentShareLinksProps = {
  projectId: string;
  contentId: string;
  contentTitle: string;
  links: ContentShareLink[];
};

function reviewUrl(token: string, contentId: string): string {
  return `${window.location.origin}/share/${token}/content/${contentId}`;
}

/**
 * Link langsung ke SATU desain untuk klien (dari link klien yang aktif & boleh review):
 * klien membuka, memberi komentar bertitik, lalu menyetujui atau minta revisi.
 */
export function ContentShareLinks({
  projectId,
  contentId,
  contentTitle,
  links,
}: ContentShareLinksProps) {
  if (links.length === 0) {
    return (
      <p className="text-sm text-ink/70">
        Belum ada link klien yang boleh menyetujui untuk desain ini.{" "}
        <Link
          href={`/admin/projects/${projectId}/share`}
          className="font-semibold text-primary underline underline-offset-4"
        >
          Buat link klien
        </Link>{" "}
        dulu, lalu kembali ke sini.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {links.map((link) => (
        <li
          key={link.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-2"
        >
          <span className="min-w-0 truncate text-sm font-medium text-ink">{link.label}</span>
          <span className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reviewUrl(link.token, contentId));
                  toast.success("Link desain disalin. Kirim ke klien untuk direview.");
                } catch {
                  toast.error("Browser menolak menyalin. Coba lagi.");
                }
              }}
            >
              <Copy aria-hidden />
              Salin link desain
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  // URL lengkap baru bisa dibuat di browser (butuh origin).
                  event.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(
                    `Halo! Desain "${contentTitle}" siap direview:\n${reviewUrl(link.token, contentId)}\n\nKlik bagian desain untuk memberi komentar, lalu tekan "Setujui" kalau sudah oke atau "Minta revisi" kalau perlu diubah.`,
                  )}`;
                }}
              >
                <MessageCircle aria-hidden />
                Kirim via WhatsApp
              </a>
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
