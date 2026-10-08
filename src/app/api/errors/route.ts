import { z } from "zod";
import { logError } from "@/lib/error-log";
import { createSessionClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().max(2000),
  digest: z.string().max(200).nullish(),
  path: z.string().max(500).nullish(),
});

/** Error dari browser (ErrorRecovery). Hanya dari situs sendiri; isi dibatasi. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const supabase = await createSessionClient();
  const claims = supabase ? (await supabase.auth.getClaims()).data?.claims : null;
  await logError({
    source: "client",
    message: parsed.data.message,
    digest: parsed.data.digest,
    path: parsed.data.path,
    userId: typeof claims?.sub === "string" ? claims.sub : null,
    userAgent: request.headers.get("user-agent"),
  });
  return new Response(null, { status: 204 });
}
