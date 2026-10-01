"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, { text: string; error?: boolean }> = {
  created: { text: "Tersimpan. Item baru sudah tampil di website." },
  saved: { text: "Perubahan tersimpan dan sudah tampil di website." },
  deleted: { text: "Item dihapus." },
  error: { text: "Aksi gagal. Coba lagi atau muat ulang halaman.", error: true },
  forbidden: { text: "Kamu belum punya akses ke halaman itu. Minta admin menambahkan izinnya di Tim & akses.", error: true },
};

/** Menampilkan notifikasi dari `?status=` setelah redirect, lalu membersihkan URL. */
export function StatusToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get("status");

  useEffect(() => {
    const message = status ? messages[status] : undefined;
    if (!message) return;
    if (message.error) toast.error(message.text);
    else toast.success(message.text);
    router.replace(pathname, { scroll: false });
  }, [status, pathname, router]);

  return null;
}
