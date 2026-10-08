"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Error yang biasanya hilang dengan memuat ulang halaman:
 * - versi baru baru saja dideploy (tab lama memanggil server action / chunk yang sudah diganti),
 * - DOM diubah ekstensi browser (mis. terjemahan otomatis Chrome).
 */
const RECOVERABLE =
  /server action|chunkloaderror|loading chunk|dynamically imported module|failed to fetch|removeChild|insertBefore|not a child of this node/i;
const GUARD_KEY = "wl-error-reload";

type ErrorRecoveryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Pulihkan otomatis sekali (muat ulang); jika masih gagal, tampilkan pesan yang jelas. */
export function ErrorRecovery({ error, reset }: ErrorRecoveryProps) {
  useEffect(() => {
    console.error(error);
    const recoverable = RECOVERABLE.test(`${error.name} ${error.message}`);
    // Catat untuk admin (kecuali error "muat ulang" yang wajar setelah deploy).
    if (!recoverable) {
      void fetch("/api/errors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: `${error.name}: ${error.message}`.slice(0, 2000),
          digest: error.digest ?? null,
          path: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    }
    if (!recoverable) return;
    try {
      // Cegah putaran muat ulang: paling sering sekali per 30 detik.
      const last = Number(sessionStorage.getItem(GUARD_KEY) ?? 0);
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(GUARD_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <main
      id="content"
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-2xl">Halaman gagal dimuat</h1>
      <p className="text-ink/75">
        Biasanya karena WeaveLens baru saja diperbarui atau browser sedang menerjemahkan halaman.
        Muat ulang halaman untuk melanjutkan.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-heading text-sm font-semibold text-primary-foreground hover:bg-brand-hover"
        >
          <RotateCcw aria-hidden className="size-4" />
          Muat ulang
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-lg border border-line bg-paper px-5 text-sm font-semibold text-ink hover:bg-canvas"
        >
          Coba lagi
        </button>
      </div>
      {error.digest && <p className="text-xs text-ink/50">Kode: {error.digest}</p>}
    </main>
  );
}
