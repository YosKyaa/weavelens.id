"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema, isId } from "@/lib/ids";
import { STAGES, FORMATS, PROJECT_TYPES } from "@/content/workspace";
import { logActivity } from "@/lib/activity";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { drivePreviewUrl } from "@/lib/design-files";
import { generateShareToken } from "@/lib/share";

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const FAILED = "Gagal menyimpan. Periksa koneksi lalu coba lagi.";
const uuid = idSchema;
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .or(z.literal("").transform(() => null));
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

function refreshProject(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
}

// ─── Proyek ────────────────────────────────────────────────────────────────

const projectSchema = z.object({
  clientId: uuid,
  title: z.string().trim().min(1, "Isi nama proyek.").max(120),
  type: z.enum(PROJECT_TYPES),
  eventDate: day,
  description: text(1000),
  status: z.enum(["draft", "active", "in_review", "revision", "approved", "delivered", "closed"]),
  /** Hanya saat membuat proyek: anggota tim yang langsung ditugaskan. */
  memberIds: z.array(idSchema).max(50).optional(),
});

export type ProjectInput = z.input<typeof projectSchema>;

export async function saveProject(
  projectId: string | null,
  input: ProjectInput,
): Promise<Result<{ id: string }>> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireAdmin();
  const value = parsed.data;
  const row = {
    client_id: value.clientId,
    title: value.title,
    type: value.type,
    event_date: value.eventDate,
    description: value.description,
    status: value.status,
    updated_at: new Date().toISOString(),
  };

  if (projectId) {
    if (!isId(projectId)) return { ok: false, error: FAILED };
    const { error } = await supabase.from("projects").update(row).eq("id", projectId);
    if (error) return { ok: false, error: FAILED };
    refreshProject(projectId);
    return { ok: true, id: projectId };
  }
  const { data, error } = await supabase.from("projects").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: FAILED };
  if (value.memberIds?.length) {
    await supabase
      .from("project_members")
      .insert(value.memberIds.map((profileId) => ({ project_id: data.id, profile_id: profileId })));
  }
  refreshProject(data.id);
  return { ok: true, id: data.id };
}

export async function deleteProject(projectId: string): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return { ok: false, error: FAILED };
  revalidatePath("/admin/projects");
  return { ok: true };
}

// ─── Konten (kartu kanban) ─────────────────────────────────────────────────

const contentSchema = z.object({
  title: z.string().trim().min(1, "Isi judul konten.").max(160),
  brandId: uuid.nullable(),
  format: z.enum(FORMATS),
  stage: z.enum(STAGES),
  dueDate: day,
  publishDate: day,
  brief: text(2000),
  caption: text(2200),
});

export type ContentInput = z.input<typeof contentSchema>;

export async function saveContent(
  projectId: string,
  contentId: string | null,
  input: ContentInput,
): Promise<Result<{ id: string }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase, user } = await requireStaff();
  const value = parsed.data;
  const row = {
    title: value.title,
    brand_id: value.brandId,
    format: value.format,
    stage: value.stage,
    due_date: value.dueDate,
    publish_date: value.publishDate,
    brief: value.brief,
    caption: value.caption,
    updated_at: new Date().toISOString(),
  };

  if (contentId) {
    if (!isId(contentId)) return { ok: false, error: FAILED };
    const { error } = await supabase
      .from("design_assets")
      .update(row)
      .eq("id", contentId)
      .eq("project_id", projectId);
    if (error) return { ok: false, error: FAILED };
    refreshProject(projectId);
    return { ok: true, id: contentId };
  }

  const { data, error } = await supabase
    .from("design_assets")
    .insert({ ...row, project_id: projectId, sort: Date.now() })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  await logActivity(supabase, {
    projectId,
    action: "content.created",
    actorId: user.id,
    meta: { title: value.title },
  });
  refreshProject(projectId);
  return { ok: true, id: data.id };
}

/** Pindah kolom/urutan di papan. `sort` dihitung di browser dari posisi kartu tetangga. */
export async function moveContent(
  projectId: string,
  contentId: string,
  stage: string,
  sort: number,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(contentId)) return { ok: false, error: FAILED };
  const parsedStage = z.enum(STAGES).safeParse(stage);
  if (!parsedStage.success || !Number.isFinite(sort)) return { ok: false, error: FAILED };
  const nextStage = parsedStage.data;
  const { supabase, user } = await requireStaff();
  const { data, error } = await supabase
    .from("design_assets")
    .update({
      stage: nextStage,
      sort,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentId)
    .eq("project_id", projectId)
    .select("title")
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  await logActivity(supabase, {
    projectId,
    action: "content.moved",
    actorId: user.id,
    meta: { title: data.title, stage: nextStage },
  });
  refreshProject(projectId);
  return { ok: true };
}

export async function deleteContent(projectId: string, contentId: string): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(contentId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { data: versions } = await supabase
    .from("design_versions")
    .select("files")
    .eq("asset_id", contentId);
  const { error } = await supabase
    .from("design_assets")
    .delete()
    .eq("id", contentId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: FAILED };

  // Bersihkan file desain di Storage supaya kuota tidak terbuang.
  const paths = (versions ?? []).flatMap((version) =>
    Array.isArray(version.files)
      ? version.files.flatMap((file) =>
          file && typeof file === "object" && !Array.isArray(file) && typeof file.path === "string"
            ? [file.path]
            : [],
        )
      : [],
  );
  if (paths.length) await supabase.storage.from("designs").remove(paths);

  refreshProject(projectId);
  return { ok: true };
}

// ─── Versi desain ──────────────────────────────────────────────────────────

const fileSchema = z.object({
  path: z.string().min(1).max(300),
  kind: z.enum(["image", "video", "pdf"]),
  name: z.string().max(200),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const versionSchema = z
  .object({
    files: z.array(fileSchema).max(20),
    externalUrl: z
      .string()
      .trim()
      .max(500)
      .transform((value) => value || null),
    note: text(1000),
  })
  .refine(
    (value) => value.files.length > 0 || value.externalUrl,
    "Pilih file atau tempel link video dulu.",
  )
  .refine(
    (value) => !value.externalUrl || drivePreviewUrl(value.externalUrl),
    "Link harus berupa link file Google Drive.",
  );

export type VersionInput = z.input<typeof versionSchema>;

/** Versi baru langsung dikirim ke klien: status "Menunggu review" dan kartu pindah kolom. */
export async function createVersion(
  projectId: string,
  contentId: string,
  input: VersionInput,
): Promise<Result<{ versionNo: number }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(contentId)) return { ok: false, error: FAILED };
  const parsed = versionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase, user } = await requireStaff();

  // File harus berada di folder proyek ini (dibuat oleh uploader di browser).
  if (parsed.data.files.some((file) => !file.path.startsWith(`${projectId}/${contentId}/`))) {
    return { ok: false, error: FAILED };
  }

  const { data: last } = await supabase
    .from("design_versions")
    .select("version_no")
    .eq("asset_id", contentId)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const versionNo = (last?.version_no ?? 0) + 1;

  const { error } = await supabase.from("design_versions").insert({
    asset_id: contentId,
    version_no: versionNo,
    files: parsed.data.files,
    file_path: parsed.data.files[0]?.path ?? null,
    external_url: parsed.data.externalUrl,
    note: parsed.data.note,
    uploaded_by: user.id,
    status: "pending_review",
  });
  if (error) return { ok: false, error: FAILED };

  await supabase
    .from("design_assets")
    .update({ stage: "client_review", updated_at: new Date().toISOString() })
    .eq("id", contentId);
  await logActivity(supabase, {
    projectId,
    action: "version.uploaded",
    actorId: user.id,
    meta: { contentId, version: versionNo },
  });
  refreshProject(projectId);
  return { ok: true, versionNo };
}

// ─── Komentar tim ──────────────────────────────────────────────────────────

export async function addTeamComment(
  projectId: string,
  versionId: string,
  body: string,
  point: { x: number; y: number; slide: number } | null,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(versionId)) return { ok: false, error: FAILED };
  const message = z.string().trim().min(1, "Tulis komentar dulu.").max(2000).safeParse(body);
  if (!message.success) return { ok: false, error: message.error.issues[0]?.message ?? FAILED };
  const { supabase, user } = await requireStaff();
  const parsedPoint = point
    ? z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          slide: z.number().int().min(0).max(50),
        })
        .safeParse(point)
    : null;
  if (parsedPoint && !parsedPoint.success) return { ok: false, error: FAILED };
  const coords = parsedPoint?.data ?? null;
  const { error } = await supabase.from("design_comments").insert({
    version_id: versionId,
    author_id: user.id,
    body: message.data,
    x: coords?.x ?? null,
    y: coords?.y ?? null,
    slide: coords?.slide ?? 0,
  });
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true };
}

export async function setCommentResolved(
  projectId: string,
  commentId: string,
  resolved: boolean,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(commentId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("design_comments")
    .update({ resolved: resolved === true })
    .eq("id", commentId);
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true };
}

// ─── Rencana kerja ─────────────────────────────────────────────────────────

const planSchema = z.object({
  title: z.string().trim().min(1, "Isi nama tahap.").max(160),
  dueDate: day,
  status: z.enum(["planned", "in_progress", "done"]),
});

export type PlanInput = z.input<typeof planSchema>;

export async function savePlanItem(
  projectId: string,
  itemId: string | null,
  input: PlanInput,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireStaff();
  const row = {
    title: parsed.data.title,
    due_date: parsed.data.dueDate,
    status: parsed.data.status,
  };

  if (itemId) {
    if (!isId(itemId)) return { ok: false, error: FAILED };
    const { error } = await supabase
      .from("plan_items")
      .update(row)
      .eq("id", itemId)
      .eq("project_id", projectId);
    if (error) return { ok: false, error: FAILED };
  } else {
    const { count } = await supabase
      .from("plan_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    const { error } = await supabase
      .from("plan_items")
      .insert({ ...row, project_id: projectId, order: count ?? 0 });
    if (error) return { ok: false, error: FAILED };
  }
  refreshProject(projectId);
  return { ok: true };
}

export async function deletePlanItem(projectId: string, itemId: string): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(itemId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("plan_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true };
}

export async function movePlanItem(
  projectId: string,
  itemId: string,
  direction: -1 | 1,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(itemId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("plan_items")
    .select("id")
    .eq("project_id", projectId)
    .order("order");
  const ids = (data ?? []).map((row) => row.id);
  const from = ids.indexOf(itemId);
  const to = from + (direction === 1 ? 1 : -1);
  if (from === -1 || to < 0 || to >= ids.length) return { ok: true };
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await Promise.all(
    ids.map((id, order) => supabase.from("plan_items").update({ order }).eq("id", id)),
  );
  refreshProject(projectId);
  return { ok: true };
}

// ─── Link akses klien ──────────────────────────────────────────────────────

const shareSchema = z.object({
  label: z.string().trim().min(1, "Beri nama link, mis. nama PIC.").max(80),
  brandId: uuid.nullable(),
  canReview: z.boolean(),
  expiresAt: day,
});

export type ShareInput = z.input<typeof shareSchema>;

export async function createShareLink(
  projectId: string,
  input: ShareInput,
): Promise<Result<{ token: string }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireStaff();
  const token = generateShareToken();
  const { error } = await supabase.from("share_links").insert({
    token,
    project_id: projectId,
    brand_id: parsed.data.brandId,
    label: parsed.data.label,
    can_review: parsed.data.canReview,
    // Berlaku sampai akhir hari yang dipilih (zona Jakarta).
    expires_at: parsed.data.expiresAt ? `${parsed.data.expiresAt}T23:59:59+07:00` : null,
  });
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true, token };
}

export async function revokeShareLink(projectId: string, linkId: string): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(linkId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true };
}
