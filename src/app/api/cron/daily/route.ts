import {
  backupDatabase,
  digestErrors,
  remindPendingReviews,
  sendTaskDigests,
} from "@/lib/cron-jobs";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Tugas harian (Vercel Cron, lihat vercel.json): pengingat review klien, ringkasan tugas tim,
 * cadangan database, ringkasan error. Hanya bisa dipanggil dengan `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = createServiceClient();
  if (!db)
    return Response.json({ ok: false, error: "Service role belum diatur." }, { status: 500 });

  const jobs = {
    backup: backupDatabase,
    reviewReminders: remindPendingReviews,
    taskDigests: sendTaskDigests,
    errors: digestErrors,
  };
  const results: Record<string, unknown> = {};
  // Berurutan & terisolasi: satu tugas gagal tidak menggagalkan yang lain.
  for (const [name, job] of Object.entries(jobs)) {
    try {
      results[name] = await job(db);
    } catch (error) {
      results[name] = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  return Response.json({ ok: true, results });
}
