"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { idSchema, isId } from "@/lib/ids";
import { STAGES, FORMATS, PROJECT_TYPES } from "@/content/workspace";
import { logActivity } from "@/lib/activity";
import { requirePermission, requireStaff } from "@/lib/auth";
import { drivePreviewUrl } from "@/lib/design-files";
import { emailClientReviewReady } from "@/lib/notify";
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
