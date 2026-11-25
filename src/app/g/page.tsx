import type { Metadata } from "next";
import { Logo } from "@/components/atoms/Logo";
import { CodeForm } from "./CodeForm";

export const metadata: Metadata = {
  title: "Cari fotomu · WeaveLens Booth",
  description: "Masukkan kode 6 huruf dari booth untuk membuka fotomu.",
  robots: { index: false, follow: false },
};

/** Cadangan bila QR tidak bisa dipindai: tamu mengetik kode sesi yang tampil di booth. */
export default function BoothCodePage() {
  return (
    <main id="content" className="min-h-dvh bg-canvas">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-6 pb-12">
        <Logo className="h-7" />
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl">Cari fotomu</h1>
          <p className="text-ink/75">
            Ketik 6 karakter terakhir dari tautan di bawah QR booth (weavelens.id/g/<strong>KODE</strong>). Kode tidak memakai O, I, 0, dan 1.
          </p>
          <CodeForm />
        </section>
      </div>
    </main>
  );
}
