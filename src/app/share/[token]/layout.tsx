import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/atoms/Logo";
import { TabNav } from "@/components/molecules/TabNav";
import { GuestName } from "@/components/organisms/GuestName";
import { Toaster } from "@/components/ui/sonner";
import { shareText } from "@/content/workspace";
import { getGuestName } from "@/lib/guest";
import { resolveShare, touchShare } from "@/lib/share";

type LayoutProps = { children: ReactNode; params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { token } = await params;
  const context = await resolveShare(token);
  return {
    title: context ? shareText.metaTitle(context.project.title) : shareText.invalid.title,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

function Invalid() {
  return (
    <main
      id="content"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-16 text-center"
    >
      <Logo className="mx-auto h-9" />
      <h1 className="mt-6 text-2xl">{shareText.invalid.title}</h1>
      <p className="text-ink/80">{shareText.invalid.body}</p>
    </main>
  );
}

/** Halaman klien lewat link: tanpa login, cakupan data dibatasi token (proyek + brand). */
export default async function ShareLayout({ children, params }: LayoutProps) {
  const { token } = await params;
  const context = await resolveShare(token);
  if (!context) return <Invalid />;
  await touchShare(context);

  const [name, contentCount, galleryCount] = await Promise.all([
    getGuestName(),
    (context.brandId
      ? context.db
          .from("design_assets")
          .select("id", { count: "exact", head: true })
          .eq("project_id", context.project.id)
          .eq("brand_id", context.brandId)
      : context.db
          .from("design_assets")
          .select("id", { count: "exact", head: true })
          .eq("project_id", context.project.id)
    ).then((result) => result.count ?? 0),
    context.db
      .from("photo_sets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", context.project.id)
      .neq("status", "uploading")
      .then((result) => result.count ?? 0),
  ]);

  const base = `/share/${token}`;
  const isDesign = context.project.type === "design" || context.project.type === "mixed";
  const tabs = [
    ...(isDesign || contentCount > 0 ? [{ href: base, label: shareText.tabs.content }] : []),
    ...(!isDesign || galleryCount > 0
      ? [{ href: `${base}/galleries`, label: shareText.tabs.galleries, count: galleryCount }]
      : []),
    { href: `${base}/progress`, label: shareText.tabs.plan },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
          <Logo priority className="h-7" />
          {context.brand && (
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1 text-sm font-semibold">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: context.brand.color }}
              />
              {context.brand.name}
            </span>
          )}
        </div>
      </header>
      <main
        id="content"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6 outline-none md:px-8 md:py-10"
      >
        <p className="text-sm text-ink/70">{context.project.clients?.name}</p>
        <h1 className="mt-1 text-2xl md:text-3xl">{context.project.title}</h1>
        {context.project.description && (
          <p className="mt-2 max-w-[65ch] whitespace-pre-line text-ink/80">
            {context.project.description}
          </p>
        )}
        <div className="mt-5 mb-6">
          <GuestName name={name} />
        </div>
        {tabs.length > 1 && <TabNav label="Bagian proyek" tabs={tabs} />}
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-sm text-ink/60">
        {shareText.footer}
      </footer>
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
