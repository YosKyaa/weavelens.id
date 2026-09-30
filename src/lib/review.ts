import type { SignedDesignFile } from "@/lib/design-files";

/** Data review desain yang sama untuk admin dan klien (aman dikirim ke komponen client). */
export type ReviewComment = {
  id: string;
  body: string;
  author: string;
  isTeam: boolean;
  x: number | null;
  y: number | null;
  slide: number;
  resolved: boolean;
  createdAt: string;
};

export type ReviewVersion = {
  id: string;
  versionNo: number;
  status: "pending_review" | "changes_requested" | "approved";
  note: string | null;
  createdAt: string;
  decidedBy: string | null;
  files: SignedDesignFile[];
  externalPreview: string | null;
  comments: ReviewComment[];
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export type CommentPoint = { x: number; y: number; slide: number };

/** Aksi review yang tersedia; diisi server action yang sudah di-bind (projectId atau token). */
export type ReviewActions = {
  comment: (versionId: string, body: string, point: CommentPoint | null) => Promise<ActionResult>;
  resolve?: (commentId: string, resolved: boolean) => Promise<ActionResult>;
  approve?: (versionId: string) => Promise<ActionResult>;
  revise?: (versionId: string) => Promise<ActionResult>;
};
