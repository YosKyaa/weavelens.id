import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** Halaman privat (portal, link klien) tidak boleh diindeks siapa pun. */
const PRIVATE = ["/admin", "/client", "/share", "/login", "/auth", "/api"];

/**
 * Crawler mesin pencari AI disebut eksplisit supaya jelas diizinkan (GEO): jawaban ChatGPT,
 * Perplexity, Gemini, Claude, Copilot, dan Apple Intelligence bisa mengutip weavelens.id.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
