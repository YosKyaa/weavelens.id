"use server";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { formatLabels, FORMATS, type ContentFormat } from "@/content/workspace";
import { requireStaff } from "@/lib/auth";
import { isId } from "@/lib/ids";

type CaptionResult =
  { ok: true; options: { caption: string; hashtags: string[] }[] } | { ok: false; error: string };

const CaptionSchema = z.object({
  options: z
    .array(
      z.object({
        caption: z.string().describe("Caption lengkap tanpa hashtag"),
        hashtags: z.array(z.string()).describe("Hashtag tanpa spasi, diawali #"),
      }),
    )
    .describe("Tiga pilihan caption dengan pendekatan berbeda"),
});

const SYSTEM = `Kamu copywriter media sosial agensi kreatif WeaveLens (Indonesia).
Tulis caption Instagram berbahasa Indonesia yang natural, enak dibaca di HP, dan sesuai brand.
Aturan:
- Ikuti gaya bahasa & panduan brand bila diberikan; itu prioritas utama.
- Kalimat pembuka harus menarik perhatian di 1 baris pertama.
- Sertakan ajakan bertindak (CTA) yang relevan dengan brief.
- Jangan mengarang fakta (harga, promo, tanggal, alamat) yang tidak ada di brief.
- Hashtag 8–15 buah: campuran hashtag brand, niche, dan lokasi bila relevan; tanpa spasi.
- Buat tiga pilihan yang benar-benar berbeda pendekatannya (mis. bercerita, informatif, singkat-punchy).`;

/**
 * Asisten caption: 3 pilihan caption + hashtag dari brief, judul, format, dan brand kit
 * (gaya bahasa + panduan). Butuh ANTHROPIC_API_KEY di server.
 */
export async function suggestCaption(
  projectId: string,
  contentId: string,
  input: { title: string; brief: string; caption: string; format: string; brandId: string | null },
): Promise<CaptionResult> {
  if (!isId(projectId) || !isId(contentId)) return { ok: false, error: "Konten tidak valid." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Asisten AI belum aktif: isi ANTHROPIC_API_KEY di Vercel." };
  }
  const title = input.title.trim().slice(0, 200);
  const brief = input.brief.trim().slice(0, 2000);
  if (!title && !brief) return { ok: false, error: "Isi judul atau brief dulu." };

  const { supabase } = await requireStaff();
  // RLS: hanya konten di proyek yang boleh diakses.
  const { data: content } = await supabase
    .from("design_assets")
    .select("id, projects!inner(title, clients(name))")
    .eq("id", contentId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!content) return { ok: false, error: "Konten tidak ditemukan." };

  const { data: brand } =
    input.brandId && isId(input.brandId)
      ? await supabase
          .from("brands")
          .select("name, instagram, voice, guideline")
          .eq("id", input.brandId)
          .maybeSingle()
      : { data: null };

  const format = (FORMATS as readonly string[]).includes(input.format)
    ? formatLabels[input.format as ContentFormat]
    : "Konten";
  const context = [
    `Klien: ${content.projects.clients?.name ?? "-"}`,
    `Proyek: ${content.projects.title}`,
    brand ? `Brand: ${brand.name}${brand.instagram ? ` (${brand.instagram})` : ""}` : "",
    brand?.voice ? `Gaya bahasa brand:\n${brand.voice}` : "",
    brand?.guideline ? `Panduan brand:\n${brand.guideline.slice(0, 3000)}` : "",
    `Format: ${format}`,
    `Judul konten: ${title || "-"}`,
    `Brief:\n${brief || "-"}`,
    input.caption.trim()
      ? `Draf caption saat ini (boleh diperbaiki):\n${input.caption.trim().slice(0, 2200)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      // Caption pendek & kreatif: effort rendah cukup dan lebih cepat.
      output_config: { effort: "low", format: betaZodOutputFormat(CaptionSchema) },
      // Bila model utama menolak (filter keamanan), API otomatis mencoba model cadangan.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: context }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return {
        ok: false,
        error: "AI tidak bisa membuat caption untuk brief ini. Coba ubah brief.",
      };
    }
    const options = response.parsed_output.options
      .slice(0, 3)
      .map((option) => ({
        caption: option.caption.trim(),
        hashtags: option.hashtags
          .map((tag) => `#${tag.replace(/^#+/, "").replace(/\s+/g, "")}`)
          .filter((tag) => tag.length > 1)
          .slice(0, 20),
      }))
      .filter((option) => option.caption);
    if (options.length === 0) return { ok: false, error: "AI tidak memberi hasil. Coba lagi." };
    return { ok: true, options };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "ANTHROPIC_API_KEY tidak valid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "AI sedang sibuk. Coba lagi sebentar." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `Layanan AI gagal (${error.status ?? "jaringan"}). Coba lagi.` };
    }
    return { ok: false, error: "Gagal menghubungi AI. Coba lagi." };
  }
}
