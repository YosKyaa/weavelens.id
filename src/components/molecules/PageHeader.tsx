import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Aksi utama halaman (satu tombol primer), rata kanan di desktop. */
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Mis. logo proyek, tampil di kiri judul. */
  icon?: ReactNode;
};

/** Judul halaman portal yang konsisten: kembali, judul, keterangan, aksi. */
export function PageHeader({ title, description, actions, back, icon }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink/75 hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {icon}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl">{title}</h1>
            {description && <p className="mt-2 max-w-[65ch] text-ink/75">{description}</p>}
          </div>
        </div>
        {/* Di HP aksi utama selebar layar (mudah diketuk); di desktop rata kanan. */}
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&>a]:flex-1 [&>button]:flex-1 sm:[&>a]:flex-none sm:[&>button]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
