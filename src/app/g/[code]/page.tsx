/* eslint-disable @next/next/no-img-element -- gambar sudah diperkecil oleh route image; next/image tidak perlu mengolah ulang. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { Logo } from "@/components/atoms/Logo";
import { site } from "@/content/site";
import {
  backupNames,
  boothEventName,
  EXTRAS,
  findBoothSession,
  normalizeCode,
  type BoothPhoto,
  type BoothSession,
} from "@/lib/booth/session";
import { findFileInFolder } from "@/lib/drive";
import { buildWaUrl } from "@/lib/wa";
import { AutoRefresh } from "./AutoRefresh";

const PENDING_REFRESH_SECONDS = 30;
/** Sama dengan ImagingSpec.GIF_MAX_FRAMES di tablet: GIF memakai paling banyak 3 foto pertama sesi. */
const GIF_MAX_FRAMES = 3;
const TITLE = "Fotomu dari WeaveLens Booth";
const DESCRIPTION = "Unduh dan bagikan foto photobooth-mu.";

type Props = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeCode((await params).code) ?? "";
  // pratinjau.jpg (bingkai 1 GIF + pita merek, 900 × 700) lebih rapi di chat daripada strip yang tinggi.
  const image = `${site.url}/g/${code}/image/pratinjau`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    // Foto tamu bersifat pribadi: halaman ini tidak boleh muncul di mesin pencari.
    robots: { index: false, follow: false },
    alternates: { canonical: null },
    referrer: "no-referrer",
    openGraph: { title: TITLE, description: DESCRIPTION, url: `${site.url}/g/${code}`, images: [image] },
    twitter: { card: "summary_large_image", title: TITLE, images: [image] },
  };
}

const primaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-heading font-semibold text-primary-foreground transition-colors hover:bg-brand-hover";
const secondaryButton =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-5 font-heading font-semibold text-ink transition-colors hover:bg-sand";

export default async function BoothGalleryPage({ params }: Props) {
  const code = normalizeCode((await params).code);
  if (!code) notFound();
  const session = await findBoothSession(code);
  // Booth memberi QR walau sedang offline, jadi tamu bisa tiba di sini sebelum fotonya terunggah.
  if (!session || (!session.composition_path && !session.drive_composition_id)) {
    const event = session ? await boothEventName(session.event_id) : null;
    return (
      <Shell event={event}>
        <Pending />
      </Shell>
    );
  }
  const [event, motion] = await Promise.all([boothEventName(session.event_id), hasMotion(session)]);
  const photos = session.booth_photos.filter((photo) => photo.drive_file_id);
  return (
    <Shell event={event}>
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl">Fotomu sudah siap</h1>
        <p className="mt-2 text-ink/75">Simpan ke HP-mu atau bagikan ke teman.</p>
      </div>
      <Result code={code} event={event} />
      {motion && (
        <Motion code={code} frames={Math.min(session.booth_photos.length, GIF_MAX_FRAMES)} />
      )}
      {photos.length > 0 ? (
        <Photos code={code} photos={photos} />
      ) : (
        <p className="text-center text-sm text-ink/70">
          Foto satuan sedang diunggah. Buka lagi halaman ini beberapa menit lagi.
        </p>
      )}
    </Shell>
  );
}

/** GIF hanya dibuat untuk sesi 2 foto atau lebih; dicek di cadangan Supabase dulu, lalu folder sesi Drive. */
async function hasMotion(session: BoothSession): Promise<boolean> {
  if (session.booth_photos.length < 2) return false;
  try {
    if ((await backupNames(session)).has(EXTRAS.gerak.file)) return true;
    if (!session.drive_folder_id) return false;
    return (await findFileInFolder(session.drive_folder_id, EXTRAS.gerak.file)) !== null;
  } catch {
    return false;
  }
}

function Shell({ event, children }: { event: string | null; children: React.ReactNode }) {
  const orderUrl = site.wa.admins[0] ? buildWaUrl(site.wa.admins[0], "photobooth") : site.url;
  return (
    <main id="content" className="min-h-dvh bg-canvas">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-6 pb-12">
        <header className="flex items-center justify-between gap-3">
          <Logo className="h-7" />
          {event && <span className="truncate text-sm font-medium text-ink/75">{event}</span>}
        </header>
        {children}
        <footer className="flex flex-col items-center gap-1 border-t border-line pt-6 text-sm text-ink/70">
          <p>Foto oleh WeaveLens</p>
          <a className="font-semibold text-primary underline-offset-4 hover:underline" href={orderUrl}>
            Pesan photobooth untuk acaramu
          </a>
        </footer>
      </div>
    </main>
  );
}

/** Komposisi setinggi maksimal 480 px agar kedua tombol tetap terlihat tanpa menggulir. */
function Result({ code, event }: { code: string; event: string | null }) {
  const url = `${site.url}/g/${code}`;
  const text = event
    ? `Ini fotoku di ${event} dari photobooth WeaveLens: ${url}`
    : `Ini fotoku dari photobooth WeaveLens: ${url}`;
  return (
    <section className="flex flex-col items-center gap-4">
      <img
        className="max-h-[480px] w-auto max-w-full rounded-2xl bg-paper shadow-sm"
        src={`/g/${code}/image/komposisi`}
        alt="Hasil photobooth-mu"
      />
      <div className="flex w-full flex-col gap-3">
        <a className={primaryButton} href={`/g/${code}/image/komposisi?unduh`} download>
          <Download aria-hidden className="size-5" />
          Unduh foto
        </a>
        <a
          className={secondaryButton}
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle aria-hidden className="size-5" />
          Bagikan ke WhatsApp
        </a>
      </div>
    </section>
  );
}

/** GIF dimuat lambat (0,5–2 MB) agar tidak menghalangi komposisi dan tombol di atasnya. */
function Motion({ code, frames }: { code: string; frames: number }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg">GIF dari {frames} fotomu</h2>
        <p className="text-sm text-ink/75">{frames} foto berganti terus. Cocok untuk status WhatsApp.</p>
      </div>
      <figure className="relative overflow-hidden rounded-2xl bg-paper">
        <img
          src={`/g/${code}/image/gerak`}
          alt={`GIF dari ${frames} fotomu`}
          width={900}
          height={700}
          loading="lazy"
          className="h-auto w-full"
        />
        <span className="absolute top-3 right-3 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-paper">
          GIF
        </span>
      </figure>
      <a className={secondaryButton} href={`/g/${code}/image/gerak?unduh`} download>
        <Download aria-hidden className="size-5" />
        Unduh GIF
      </a>
    </section>
  );
}

function Photos({ code, photos }: { code: string; photos: BoothPhoto[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg">Foto satuan</h2>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <figure key={photo.index} className="flex flex-col gap-2">
            <img
              src={`/g/${code}/image/foto-${photo.index}`}
              alt={`Foto ${photo.index}`}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-xl bg-paper object-cover"
            />
            <a
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
              href={`/g/${code}/image/foto-${photo.index}?unduh`}
              download
            >
              <Download aria-hidden className="size-4" />
              Unduh foto {photo.index}
            </a>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Sesi belum sampai dari booth. Halaman memuat ulang sendiri; tamu tidak perlu memindai lagi. */
function Pending() {
  return (
    <section className="flex flex-col items-center gap-3 py-10 text-center" aria-live="polite">
      <span
        aria-hidden
        className="size-10 animate-spin rounded-full border-4 border-sand-deep border-t-primary motion-reduce:animate-none"
      />
      <h1 className="text-2xl">Fotomu sedang dalam perjalanan</h1>
      <p className="text-ink/75">
        Booth mengirim fotomu begitu terhubung internet. Halaman ini memuat ulang sendiri tiap{" "}
        {PENDING_REFRESH_SECONDS} detik.
      </p>
      <p className="text-sm text-ink/70">Tidak perlu pindai ulang. Biarkan halaman ini terbuka.</p>
      <AutoRefresh seconds={PENDING_REFRESH_SECONDS} />
    </section>
  );
}
