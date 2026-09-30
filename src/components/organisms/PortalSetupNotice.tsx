import { portal } from "@/content/portal";

/** Tampil di portal selama env Supabase belum diisi. Landing page tetap jalan dengan konten bawaan. */
export function PortalSetupNotice() {
  return (
    <main
      id="content"
      className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-3xl">{portal.setup.heading}</h1>
      <p>{portal.setup.body}</p>
      <p className="text-ink/80">{portal.setup.hint}</p>
    </main>
  );
}
