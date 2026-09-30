import Link from "next/link";
import { Logo } from "@/components/atoms/Logo";
import { WaLink } from "@/components/atoms/WaLink";
import { site } from "@/content/site";

export default function NotFound() {
  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-20 text-center outline-none"
    >
      <Logo priority className="h-10" />
      <h1 className="mt-10 text-3xl leading-tight md:text-4xl">{site.notFound.heading}</h1>
      <p className="mt-4 text-lg">{site.notFound.body}</p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <WaLink section="not-found" />
        <Link
          href="/"
          className="inline-flex h-11 items-center font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-primary"
        >
          {site.notFound.homeLabel}
        </Link>
      </div>
    </main>
  );
}
