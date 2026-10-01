import { getCms } from "@/lib/cms/data";
import { llmsText } from "@/lib/structured-data";

/** Ringkasan untuk asisten AI (llmstxt.org). Ikut diperbarui saat konten CMS berubah. */
export const revalidate = 3600;

export async function GET() {
  const body = llmsText(await getCms());
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
