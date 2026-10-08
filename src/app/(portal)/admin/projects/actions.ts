"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { idSchema, isId } from "@/lib/ids";
import { STAGES, FORMATS, PROJECT_TYPES } from "@/content/workspace";
import { logActivity } from "@/lib/activity";
import { requirePermission, requireStaff } from "@/lib/auth";
import { drivePreviewUrl } from "@/lib/design-files";
import { emailAssignment, emailClientReviewReady } from "@/lib/notify";
import type { CommentTarget } from "@/lib/review";
import { parseComment } from "@/lib/review-decision";
import { generateShareToken } from "@/lib/share";
import { createServiceClient } from "@/lib/supabase/service";

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
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/projects/${projectId}`, "layout");
  revalidatePath("/admin/projects");
  revalidatePath("/admin");
}

// ─── Proyek ────────────────────────────────────────────────────────────────

type SessionDb = Awaited<ReturnType<typeof requireStaff>>["supabase"];

/**
 * Link klien otomatis: satu link per brand yang belum punya link aktif
 * (atau satu link "Semua konten" jika klien belum punya brand). Proyek khusus satu brand
 * hanya mendapat link untuk brand itu. Mengembalikan jumlah link baru.
 */
async function ensureBrandLinks(
  supabase: SessionDb,
  projectId: string,
  clientId: string,
  projectBrandId: string | null = null,
): Promise<number> {
  let brandQuery = supabase.from("brands").select("id, name").eq("client_id", clientId);
  if (projectBrandId) brandQuery = brandQuery.eq("id", projectBrandId);
  const [{ data: brands }, { data: links }] = await Promise.all([
    brandQuery.order("sort"),
    supabase
      .from("share_links")
      .select("brand_id, expires_at")
      .eq("project_id", projectId)
      .is("revoked_at", null),
  ]);
  const now = Date.now();
  const active = (links ?? []).filter(
    (link) => !link.expires_at || new Date(link.expires_at).getTime() > now,
  );
  const covered = new Set(active.map((link) => link.brand_id));
  const rows = (brands ?? []).length
    ? (brands ?? [])
        .filter((brand) => !covered.has(brand.id))
        .map((brand) => ({ brand_id: brand.id, label: `PIC ${brand.name}` }))
    : active.length
      ? []
      : [{ brand_id: null, label: "Semua konten" }];
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("share_links").insert(
    rows.map((row) => ({
      ...row,
      token: generateShareToken(),
      project_id: projectId,
      can_review: true,
    })),
  );
  return error ? 0 : rows.length;
}

/** Brand khusus proyek (atau `null` = proyek gabungan). */
async function projectBrand(supabase: SessionDb, projectId: string) {
  const { data } = await supabase
    .from("projects")
    .select("client_id, brand_id")
    .eq("id", projectId)
    .maybeSingle();
  return data;
}

const projectSchema = z.object({
  clientId: uuid,
  /** Proyek khusus satu brand milik klien; kosong = proyek gabungan semua brand. */
  brandId: uuid.nullable().optional(),
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
  const { supabase } = await requirePermission("projects.manage");
  const value = parsed.data;
  const brandId = value.brandId ?? null;
  if (brandId) {
    // Brand harus milik klien proyek ini.
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("client_id", value.clientId)
      .maybeSingle();
    if (!brand) return { ok: false, error: "Brand tidak ditemukan untuk klien ini." };
  }
  const row = {
    client_id: value.clientId,
    brand_id: brandId,
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
    if (brandId)
      await focusProjectOnBrand(supabase, projectId, value.clientId, brandId, value.type);
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
  // Proyek konten: link review klien per brand langsung tersedia di tab Link klien.
  if (value.type === "design" || value.type === "mixed") {
    await ensureBrandLinks(supabase, data.id, value.clientId, brandId);
  }
  refreshProject(data.id);
  return { ok: true, id: data.id };
}

/**
 * Proyek dijadikan khusus satu brand: konten tanpa brand ikut brand ini, link klien untuk
 * brand LAIN dicabut (tidak relevan lagi), dan link untuk brand ini dibuat bila belum ada.
 */
async function focusProjectOnBrand(
  supabase: SessionDb,
  projectId: string,
  clientId: string,
  brandId: string,
  type: string,
) {
  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("design_assets")
      .update({ brand_id: brandId, updated_at: now })
      .eq("project_id", projectId)
      .is("brand_id", null),
    supabase
      .from("share_links")
      .update({ revoked_at: now })
      .eq("project_id", projectId)
      .is("revoked_at", null)
      .not("brand_id", "is", null)
      .neq("brand_id", brandId),
  ]);
  if (type === "design" || type === "mixed") {
    await ensureBrandLinks(supabase, projectId, clientId, brandId);
  }
}

export async function deleteProject(projectId: string): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const { supabase } = await requirePermission("projects.manage");
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
  /** Penanggung jawab (admin/tim). `undefined` = tidak diubah. */
  assigneeId: uuid.nullable().optional(),
});

export type ContentInput = z.input<typeof contentSchema>;

/** Penanggung jawab harus anggota tim/admin yang aktif. */
async function isActiveStaff(supabase: SessionDb, profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .in("role", ["admin", "team"])
    .eq("active", true)
    .maybeSingle();
  return Boolean(data);
}

/** Catat penugasan (lonceng penerima) + email bila aktif. */
async function announceAssignment(
  supabase: SessionDb,
  input: {
    projectId: string;
    contentId: string;
    title: string;
    assigneeId: string;
    actor: { id: string; name: string };
    dueDate: string | null;
  },
) {
  // Penanggung jawab otomatis jadi anggota tim proyek, supaya bisa membuka kontennya.
  const db = createServiceClient();
  if (db) {
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", input.assigneeId)
      .maybeSingle();
    if (profile?.role === "team") {
      await db
        .from("project_members")
        .upsert(
          { project_id: input.projectId, profile_id: input.assigneeId },
          { onConflict: "project_id,profile_id", ignoreDuplicates: true },
        );
    }
  }
  await logActivity(supabase, {
    projectId: input.projectId,
    action: "content.assigned",
    actorId: input.actor.id,
    actorName: input.actor.name,
    meta: { title: input.title, contentId: input.contentId, assigneeId: input.assigneeId },
  });
  if (input.assigneeId === input.actor.id) return;
  after(async () => {
    const db = createServiceClient();
    if (db) {
      await emailAssignment(db, {
        assigneeId: input.assigneeId,
        projectId: input.projectId,
        contentId: input.contentId,
        title: input.title,
        actorName: input.actor.name,
        dueDate: input.dueDate,
      });
    }
  });
}

export async function saveContent(
  projectId: string,
  contentId: string | null,
  input: ContentInput,
): Promise<Result<{ id: string }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const session = await requireStaff();
  const { supabase, user } = session;
  const value = parsed.data;
  if (value.assigneeId && !(await isActiveStaff(supabase, value.assigneeId))) {
    return { ok: false, error: "Penanggung jawab tidak ditemukan atau sudah nonaktif." };
  }
  const actor = { id: user.id, name: session.profile.full_name || user.email || "Tim WeaveLens" };
  const project = await projectBrand(supabase, projectId);
  const row = {
    title: value.title,
    // Proyek khusus satu brand: semua konten otomatis brand itu.
    brand_id: project?.brand_id ?? value.brandId,
    format: value.format,
    stage: value.stage,
    due_date: value.dueDate,
    publish_date: value.publishDate,
    brief: value.brief,
    caption: value.caption,
    ...(value.assigneeId !== undefined && { assignee_id: value.assigneeId }),
    updated_at: new Date().toISOString(),
  };

  if (contentId) {
    if (!isId(contentId)) return { ok: false, error: FAILED };
    const { data: before } = await supabase
      .from("design_assets")
      .select("assignee_id")
      .eq("id", contentId)
      .maybeSingle();
    const { error } = await supabase
      .from("design_assets")
      .update(row)
      .eq("id", contentId)
      .eq("project_id", projectId);
    if (error) return { ok: false, error: FAILED };
    if (value.assigneeId && value.assigneeId !== before?.assignee_id) {
      await announceAssignment(supabase, {
        projectId,
        contentId,
        title: value.title,
        assigneeId: value.assigneeId,
        actor,
        dueDate: value.dueDate,
      });
    }
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
  if (value.assigneeId) {
    await announceAssignment(supabase, {
      projectId,
      contentId: data.id,
      title: value.title,
      assigneeId: value.assigneeId,
      actor,
      dueDate: value.dueDate,
    });
  }
  refreshProject(projectId);
  revalidatePath("/admin/tasks");
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

/** Kalender: ubah (atau hapus) tanggal tayang dengan menyeret kartu. */
export async function setPublishDate(
  projectId: string,
  contentId: string,
  date: string | null,
): Promise<Result> {
  if (!isId(projectId) || !isId(contentId)) return { ok: false, error: FAILED };
  const parsed = day.safeParse(date ?? "");
  if (!parsed.success) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("design_assets")
    .update({ publish_date: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", contentId)
    .eq("project_id", projectId);
  if (error) return { ok: false, error: FAILED };
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
  options: { notifyClient?: boolean } = {},
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
  if (options.notifyClient !== false) {
    after(async () => {
      const db = createServiceClient();
      if (db) await emailClientReviewReady(db, { projectId, contentIds: [contentId], versionNo });
    });
  }
  return { ok: true, versionNo };
}

/** Setelah unggah banyak: satu email ringkasan ke klien, bukan satu email per desain. */
export async function notifyBulkUpload(projectId: string, contentIds: string[]): Promise<Result> {
  if (!isId(projectId) || !contentIds.every(isId) || contentIds.length > 50) {
    return { ok: false, error: FAILED };
  }
  await requireStaff();
  after(async () => {
    const db = createServiceClient();
    if (db) await emailClientReviewReady(db, { projectId, contentIds, versionNo: 1 });
  });
  return { ok: true };
}

// ─── Komentar tim ──────────────────────────────────────────────────────────

export async function addTeamComment(
  projectId: string,
  versionId: string,
  body: string,
  point: { x: number; y: number; slide: number } | null,
  target?: CommentTarget,
): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (!isId(versionId)) return { ok: false, error: FAILED };
  const comment = parseComment(body, point, target);
  if (!comment.ok) return comment;
  const { supabase, user } = await requireStaff();
  const { error } = await supabase.from("design_comments").insert({
    version_id: versionId,
    author_id: user.id,
    body: comment.body,
    x: comment.x,
    y: comment.y,
    slide: comment.slide,
    target: comment.target,
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
  const project = await projectBrand(supabase, projectId);
  const token = generateShareToken();
  const { error } = await supabase.from("share_links").insert({
    token,
    project_id: projectId,
    brand_id: project?.brand_id ?? parsed.data.brandId,
    label: parsed.data.label,
    can_review: parsed.data.canReview,
    // Berlaku sampai akhir hari yang dipilih (zona Jakarta).
    expires_at: parsed.data.expiresAt ? `${parsed.data.expiresAt}T23:59:59+07:00` : null,
  });
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true, token };
}

/** Tombol "Buat link untuk semua brand" di tab Link klien. */
export async function createBrandLinks(projectId: string): Promise<Result<{ created: number }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const { supabase } = await requireStaff();
  const project = await projectBrand(supabase, projectId);
  if (!project) return { ok: false, error: FAILED };
  const created = await ensureBrandLinks(supabase, projectId, project.client_id, project.brand_id);
  refreshProject(projectId);
  return { ok: true, created };
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

// ─── Import banyak (tempel dari Google Sheets / Excel / CSV) ───────────────

const BRAND_COLORS = ["#74342B", "#2B5C74", "#4F6B2F", "#8A5A12", "#5B3F86", "#1F6F68"];

const importContentSchema = z.object({
  rows: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        brandName: z.string().trim().max(80).nullable(),
        format: z.enum(FORMATS),
        publishDate: day,
        dueDate: day,
        brief: text(2000),
        caption: text(2200),
      }),
    )
    .min(1, "Tidak ada baris untuk diimport.")
    .max(300, "Maksimal 300 baris sekali import."),
  /** Nama brand yang belum ada dan boleh dibuat. */
  newBrands: z.array(z.string().trim().min(1).max(80)).max(30),
});

export type ImportContentInput = z.input<typeof importContentSchema>;

/** Rencana konten → kartu di kolom Brief (sekali jalan, urutan sesuai tabel). */
export async function importContents(
  projectId: string,
  input: ImportContentInput,
): Promise<Result<{ created: number; brandsCreated: number }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = importContentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase, user } = await requireStaff();

  const project = await projectBrand(supabase, projectId);
  if (!project) return { ok: false, error: FAILED };
  // Proyek khusus satu brand: semua baris masuk brand itu, kolom Brand diabaikan.
  if (project.brand_id) {
    parsed.data.newBrands = [];
    for (const row of parsed.data.rows) row.brandName = null;
  }

  const { data: existing } = await supabase
    .from("brands")
    .select("id, name, sort")
    .eq("client_id", project.client_id);
  const brandId = new Map((existing ?? []).map((brand) => [brand.name.toLowerCase(), brand.id]));

  // Brand baru (hanya yang memang dipakai baris import & belum ada).
  const wanted = [...new Set(parsed.data.newBrands.map((name) => name.trim()))].filter(
    (name) =>
      !brandId.has(name.toLowerCase()) &&
      parsed.data.rows.some((row) => row.brandName?.toLowerCase() === name.toLowerCase()),
  );
  let brandsCreated = 0;
  if (wanted.length) {
    const start = (existing ?? []).reduce((max, brand) => Math.max(max, brand.sort), 0) + 1;
    const { data: inserted, error } = await supabase
      .from("brands")
      .insert(
        wanted.map((name, index) => ({
          client_id: project.client_id,
          name,
          color: BRAND_COLORS[((existing?.length ?? 0) + index) % BRAND_COLORS.length],
          sort: start + index,
        })),
      )
      .select("id, name");
    if (error) {
      return {
        ok: false,
        error:
          "Brand baru tidak bisa dibuat (butuh izin Klien & brand). Hapus centang brand baru atau minta admin.",
      };
    }
    for (const brand of inserted ?? []) brandId.set(brand.name.toLowerCase(), brand.id);
    brandsCreated = inserted?.length ?? 0;
  }

  const base = Date.now();
  const { error } = await supabase.from("design_assets").insert(
    parsed.data.rows.map((row, index) => ({
      project_id: projectId,
      title: row.title,
      brand_id:
        project.brand_id ??
        (row.brandName ? (brandId.get(row.brandName.toLowerCase()) ?? null) : null),
      format: row.format,
      stage: "brief",
      publish_date: row.publishDate,
      due_date: row.dueDate,
      brief: row.brief,
      caption: row.caption,
      sort: base + index,
    })),
  );
  if (error) return { ok: false, error: FAILED };

  await logActivity(supabase, {
    projectId,
    action: "content.imported",
    actorId: user.id,
    meta: { count: parsed.data.rows.length },
  });
  refreshProject(projectId);
  return { ok: true, created: parsed.data.rows.length, brandsCreated };
}

const importPlanSchema = z.object({
  rows: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        dueDate: day,
        status: z.enum(["planned", "in_progress", "done"]),
        description: text(1000),
      }),
    )
    .min(1, "Tidak ada baris untuk diimport.")
    .max(200, "Maksimal 200 baris sekali import."),
});

export type ImportPlanInput = z.input<typeof importPlanSchema>;

/** Tahapan rencana kerja ditambahkan di akhir daftar, sesuai urutan tabel. */
export async function importPlanItems(
  projectId: string,
  input: ImportPlanInput,
): Promise<Result<{ created: number }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = importPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const { supabase } = await requireStaff();
  const { data: last } = await supabase
    .from("plan_items")
    .select("order")
    .eq("project_id", projectId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = (last?.order ?? -1) + 1;
  const { error } = await supabase.from("plan_items").insert(
    parsed.data.rows.map((row, index) => ({
      project_id: projectId,
      title: row.title,
      due_date: row.dueDate,
      status: row.status,
      description: row.description,
      order: start + index,
    })),
  );
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true, created: parsed.data.rows.length };
}

// ─── Logo proyek ───────────────────────────────────────────────────────────

/** Simpan / hapus logo proyek. File sudah diunggah browser ke bucket `logos/<projectId>/…`. */
export async function setProjectLogo(projectId: string, path: string | null): Promise<Result> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  if (path !== null && !new RegExp(`^${projectId}/[A-Za-z0-9-]+\.(png|jpe?g|webp)$`).test(path)) {
    return { ok: false, error: FAILED };
  }
  const { supabase } = await requirePermission("projects.manage");
  const { data: current } = await supabase
    .from("projects")
    .select("logo_path")
    .eq("id", projectId)
    .maybeSingle();
  const { error } = await supabase
    .from("projects")
    .update({ logo_path: path, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { ok: false, error: FAILED };
  // Logo lama tidak dipakai lagi.
  if (current?.logo_path && current.logo_path !== path) {
    await supabase.storage.from("logos").remove([current.logo_path]);
  }
  refreshProject(projectId);
  revalidatePath("/client", "layout");
  return { ok: true };
}

/** Simpan urutan rencana kerja hasil drag (seluruh daftar, urutan baru). */
export async function reorderPlanItems(projectId: string, ids: string[]): Promise<Result> {
  if (!isId(projectId) || ids.length > 500 || !ids.every(isId)) {
    return { ok: false, error: FAILED };
  }
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("plan_items").select("id").eq("project_id", projectId);
  const known = new Set((data ?? []).map((row) => row.id));
  // Hanya tahapan proyek ini; tahapan yang tidak dikirim (mis. baru ditambah orang lain) ke belakang.
  const ordered = [
    ...ids.filter((id) => known.has(id)),
    ...[...known].filter((id) => !ids.includes(id)),
  ];
  const results = await Promise.all(
    ordered.map((id, order) =>
      supabase.from("plan_items").update({ order }).eq("id", id).eq("project_id", projectId),
    ),
  );
  if (results.some((result) => result.error)) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true };
}

/** Hapus beberapa tahapan sekaligus (pilih banyak). */
export async function deletePlanItems(
  projectId: string,
  ids: string[],
): Promise<Result<{ deleted: number }>> {
  if (!isId(projectId) || ids.length === 0 || ids.length > 500 || !ids.every(isId)) {
    return { ok: false, error: FAILED };
  }
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("plan_items")
    .delete()
    .eq("project_id", projectId)
    .in("id", ids)
    .select("id");
  if (error) return { ok: false, error: FAILED };
  refreshProject(projectId);
  return { ok: true, deleted: data?.length ?? 0 };
}

const publishSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      "Link harus diawali https://",
    )
    .transform((value) => value || null),
  date: day,
});

/**
 * Tandai konten sudah tayang (+ link postingan). Tahap otomatis pindah ke "Tayang";
 * `url` kosong dan `unpublish` = batalkan tanda tayang (kembali ke "Disetujui").
 */
export async function markPublished(
  projectId: string,
  contentId: string,
  input: { url: string; date: string; unpublish?: boolean },
): Promise<Result> {
  if (!isId(projectId) || !isId(contentId)) return { ok: false, error: FAILED };
  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  }
  const session = await requireStaff();
  const { supabase, user } = session;
  const unpublish = input.unpublish === true;
  const publishedAt = parsed.data.date
    ? new Date(`${parsed.data.date}T12:00:00+07:00`).toISOString()
    : new Date().toISOString();
  const { data, error } = await supabase
    .from("design_assets")
    .update(
      unpublish
        ? {
            stage: "approved",
            published_url: null,
            published_at: null,
            updated_at: new Date().toISOString(),
          }
        : {
            stage: "published",
            published_url: parsed.data.url,
            published_at: publishedAt,
            updated_at: new Date().toISOString(),
          },
    )
    .eq("id", contentId)
    .eq("project_id", projectId)
    .select("title")
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  await logActivity(supabase, {
    projectId,
    action: unpublish ? "content.moved" : "content.published",
    actorId: user.id,
    actorName: session.profile.full_name || undefined,
    meta: unpublish
      ? { title: data.title, stage: "approved" }
      : { title: data.title, url: parsed.data.url },
  });
  refreshProject(projectId);
  return { ok: true };
}

// ─── Duplikat proyek (bulan berikutnya) ────────────────────────────────────

/** Geser tanggal YYYY-MM-DD sejumlah bulan; tanggal 31 → hari terakhir bulan tujuan. */
function shiftMonths(value: string | null, months: number): string | null {
  if (!value) return null;
  const [year, month, date] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(date, last));
  return target.toISOString().slice(0, 10);
}

const duplicateSchema = z.object({
  title: z.string().trim().min(1, "Isi nama proyek baru.").max(120),
  months: z.number().int().min(0).max(12),
  copyPlan: z.boolean(),
  copyContent: z.boolean(),
  copyMembers: z.boolean(),
});

export type DuplicateInput = z.input<typeof duplicateSchema>;

/**
 * Salin proyek untuk periode berikutnya: klien, brand, jenis, deskripsi, logo, anggota tim,
 * rencana kerja (status direset) dan—opsional—daftar konten sebagai Brief baru. Semua tanggal
 * digeser `months` bulan. Desain, komentar, dan persetujuan tidak ikut.
 */
export async function duplicateProject(
  projectId: string,
  input: DuplicateInput,
): Promise<Result<{ id: string }>> {
  if (!isId(projectId)) return { ok: false, error: FAILED };
  const parsed = duplicateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAILED };
  const options = parsed.data;
  const session = await requirePermission("projects.manage");
  const { supabase, user } = session;

  const { data: source } = await supabase
    .from("projects")
    .select("client_id, brand_id, type, event_date, description, logo_path")
    .eq("id", projectId)
    .maybeSingle();
  if (!source) return { ok: false, error: "Proyek sumber tidak ditemukan." };

  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      client_id: source.client_id,
      brand_id: source.brand_id,
      title: options.title,
      type: source.type,
      event_date: shiftMonths(source.event_date, options.months),
      description: source.description,
      status: "active",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: FAILED };
  const newId = created.id;

  const [plan, contents, members] = await Promise.all([
    options.copyPlan
      ? supabase
          .from("plan_items")
          .select("title, description, due_date, order")
          .eq("project_id", projectId)
          .order("order")
      : null,
    options.copyContent
      ? supabase
          .from("design_assets")
          .select("title, format, brand_id, brief, due_date, publish_date, assignee_id, sort")
          .eq("project_id", projectId)
          .order("sort")
          .limit(500)
      : null,
    options.copyMembers
      ? supabase.from("project_members").select("profile_id").eq("project_id", projectId)
      : null,
  ]);

  const now = new Date().toISOString();
  const writes: PromiseLike<{ error: unknown }>[] = [];
  if (plan?.data?.length) {
    writes.push(
      supabase.from("plan_items").insert(
        plan.data.map((item) => ({
          project_id: newId,
          title: item.title,
          description: item.description,
          due_date: shiftMonths(item.due_date, options.months),
          order: item.order,
          status: "planned",
        })),
      ),
    );
  }
  if (contents?.data?.length) {
    writes.push(
      supabase.from("design_assets").insert(
        contents.data.map((item) => ({
          project_id: newId,
          title: item.title,
          format: item.format,
          brand_id: source.brand_id ?? item.brand_id,
          brief: item.brief,
          due_date: shiftMonths(item.due_date, options.months),
          publish_date: shiftMonths(item.publish_date, options.months),
          assignee_id: item.assignee_id,
          sort: item.sort,
          stage: "brief",
          updated_at: now,
        })),
      ),
    );
  }
  if (members?.data?.length) {
    writes.push(
      supabase
        .from("project_members")
        .insert(members.data.map((row) => ({ project_id: newId, profile_id: row.profile_id }))),
    );
  }
  const results = await Promise.all(writes);
  const partial = results.some((result) => result.error);

  // Logo disalin (bukan dipakai bersama) supaya mengganti logo salah satu proyek tidak
  // memengaruhi yang lain.
  if (source.logo_path) {
    const db = createServiceClient();
    const extension = source.logo_path.split(".").pop() ?? "png";
    const target = `${newId}/logo-${Date.now()}.${extension}`;
    const copied = db ? await db.storage.from("logos").copy(source.logo_path, target) : null;
    if (copied && !copied.error) {
      await supabase.from("projects").update({ logo_path: target }).eq("id", newId);
    }
  }

  if (source.type === "design" || source.type === "mixed") {
    await ensureBrandLinks(supabase, newId, source.client_id, source.brand_id);
  }
  await logActivity(supabase, {
    projectId: newId,
    action: "project.duplicated",
    actorId: user.id,
    actorName: session.profile.full_name || undefined,
    meta: { from: projectId },
  });
  refreshProject(newId);
  if (partial) {
    return {
      ok: false,
      error: "Proyek baru dibuat, tapi sebagian rencana/konten gagal disalin. Periksa proyek baru.",
    };
  }
  return { ok: true, id: newId };
}
