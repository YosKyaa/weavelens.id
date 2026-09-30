import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { classifySource, deviceFromUserAgent, isBot } from "@/lib/analytics-source";
import { createServiceClient } from "@/lib/supabase/service";

/** Pencatat analitik tanpa cookie. Dipanggil lewat navigator.sendBeacon dari PageTracker/CtaTracker. */
const payloadSchema = z.object({
  type: z.enum(["pageview", "cta"]),
  path: z.string().startsWith("/").max(300),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(60).optional(),
  utmMedium: z.string().max(60).optional(),
  utmCampaign: z.string().max(100).optional(),
  section: z.string().max(40).optional(),
  admin: z.string().max(60).optional(),
});

const noContent = () => new NextResponse(null, { status: 204 });

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** Hash harian: pengunjung yang sama terhitung sekali per hari, tanpa menyimpan IP. */
function visitorHash(ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT ?? "weavelens";
  return createHash("sha256").update(`${salt}:${day}:${ip}:${ua}`).digest("hex").slice(0, 32);
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return noContent();

  const supabase = createServiceClient();
  if (!supabase) return noContent();

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return noContent();
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return noContent();
  const data = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const referrerHost = hostOf(data.referrer);

  const { error } = await supabase.from("analytics_events").insert({
    type: data.type,
    path: data.path,
    source: classifySource({
      referrerHost,
      siteHost: request.nextUrl.hostname,
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
    }),
    referrer_host: referrerHost,
    utm_source: data.utmSource ?? null,
    utm_medium: data.utmMedium ?? null,
    utm_campaign: data.utmCampaign ?? null,
    device: deviceFromUserAgent(ua),
    country: request.headers.get("x-vercel-ip-country"),
    city: decodeHeader(request.headers.get("x-vercel-ip-city")),
    visitor_hash: visitorHash(ip, ua),
    section: data.section ?? null,
    admin_id: data.admin ?? null,
  });
  if (error) console.error("[analytics] gagal mencatat:", error.message);

  return noContent();
}
