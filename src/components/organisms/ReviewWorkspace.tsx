"use client";

import { useMemo, useState, useTransition, type MouseEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/atoms/StatusBadge";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatAspect, shareText, workspaceText, type ContentFormat } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import type { CommentPoint, ReviewActions, ReviewComment, ReviewVersion } from "@/lib/review";
import { cn } from "@/lib/utils";

const text = shareText.content;
const adminText = workspaceText.content.comments;

type ReviewWorkspaceProps = {
  versions: ReviewVersion[];
  format: ContentFormat;
  actions: ReviewActions;
  /** Pemegang link hanya-lihat tidak bisa berkomentar. */
  canComment: boolean;
  /** Klien: tampilkan tombol Setujui / Minta revisi. */
  showDecision?: boolean;
  emptyMessage: string;
};

function frameWidth(format: ContentFormat): string {
  return format === "story" || format === "reels" ? "max-w-sm" : "max-w-xl";
}

export function ReviewWorkspace({
  versions,
  format,
  actions,
  canComment,
  showDecision = false,
  emptyMessage,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const [versionId, setVersionId] = useState(versions[0]?.id ?? null);
  const [slide, setSlide] = useState(0);
  const [point, setPoint] = useState<CommentPoint | null>(null);
  const [body, setBody] = useState("");
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const version = versions.find((item) => item.id === versionId) ?? versions[0];
  const isLatest = version?.id === versions[0]?.id;
  const files = version?.files ?? [];
  const file = files[Math.min(slide, Math.max(0, files.length - 1))];
  const canPin = canComment && isLatest && file?.kind === "image";

  // Nomor titik mengikuti urutan komentar bertitik di versi ini.
  const pinNumbers = useMemo(() => {
    const map = new Map<string, number>();
    version?.comments
      .filter((comment) => comment.x !== null && comment.y !== null)
      .forEach((comment, index) => map.set(comment.id, index + 1));
    return map;
  }, [version]);
  const nextPin = pinNumbers.size + 1;

  if (!version) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-paper px-6 py-10 text-center text-ink/70">
        {emptyMessage}
      </p>
    );
  }

  const openComments = version.comments.filter((comment) => !comment.resolved);
  const pins = version.comments.filter(
    (comment) => comment.x !== null && comment.y !== null && comment.slide === slide,
  );

  function selectVersion(id: string) {
    setVersionId(id);
    setSlide(0);
    setPoint(null);
  }

  function placePin(event: MouseEvent<HTMLDivElement>) {
    if (!canPin) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
    setPoint({ x, y, slide });
    document.getElementById("review-comment")?.focus();
  }

  function focusComment(comment: ReviewComment) {
    setActiveComment(comment.id);
    if (comment.x !== null) setSlide(comment.slide);
  }

  function submitComment() {
    if (!body.trim()) return;
    startTransition(async () => {
      const result = await actions.comment(version.id, body, point);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(text.commentSent);
      setBody("");
      setPoint(null);
      router.refresh();
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    return async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Gagal. Coba lagi.");
        return;
      }
      toast.success(success);
      router.refresh();
    };
  }

  const decided = version.status !== "pending_review";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid content-start gap-4">
        {/* Pilihan versi */}
        {versions.length > 1 && (
          <div role="tablist" aria-label="Versi desain" className="flex flex-wrap gap-2">
            {versions.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === version.id}
                onClick={() => selectVersion(item.id)}
                className={cn(
                  "rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink/75 hover:text-ink",
                  item.id === version.id && "border-ink bg-ink text-paper hover:text-paper",
                )}
              >
                {workspaceText.content.versions.label(item.versionNo)}
                {item.id === versions[0].id && ` · ${text.latest}`}
              </button>
            ))}
          </div>
        )}

        <div className={cn("mx-auto w-full", frameWidth(format))}>
          <div className="overflow-hidden rounded-2xl border border-line bg-ink/5 shadow-soft">
            {file?.kind === "image" && (
              <div
                className={cn("relative", canPin && "cursor-crosshair")}
                onClick={placePin}
                role={canPin ? "button" : undefined}
                aria-label={canPin ? text.pinHint : undefined}
                tabIndex={-1}
              >
                <Image
                  src={file.url}
                  alt={file.name}
                  width={file.width ?? 1080}
                  height={file.height ?? 1350}
                  unoptimized
                  draggable={false}
                  className="block h-auto w-full select-none"
                />
                {pins.map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveComment(comment.id);
                      document
                        .getElementById(`comment-${comment.id}`)
                        ?.scrollIntoView({ block: "nearest" });
                    }}
                    aria-label={`${adminText.pin(pinNumbers.get(comment.id) ?? 0)}: ${comment.body}`}
                    style={{
                      left: `${(comment.x ?? 0) * 100}%`,
                      top: `${(comment.y ?? 0) * 100}%`,
                    }}
                    className={cn(
                      "absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-paper font-heading text-xs font-bold shadow-lift transition-transform",
                      comment.resolved
                        ? "bg-ink/60 text-paper"
                        : "bg-primary text-primary-foreground",
                      activeComment === comment.id && "scale-125 ring-2 ring-sand",
                    )}
                  >
                    {pinNumbers.get(comment.id)}
                  </button>
                ))}
                {point && point.slide === slide && (
                  <span
                    aria-hidden
                    style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                    className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-paper bg-sand font-heading text-xs font-bold text-ink shadow-lift"
                  >
                    {nextPin}
                  </span>
                )}
              </div>
            )}
            {file?.kind === "video" && (
              <video
                src={file.url}
                controls
                playsInline
                className={cn("block w-full bg-ink", formatAspect[format])}
              />
            )}
            {file?.kind === "pdf" && (
              <div className="grid gap-2 p-4">
                <iframe
                  src={file.url}
                  title={file.name}
                  className="aspect-[1/1.414] w-full rounded-lg bg-paper"
                />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline"
                >
                  <ExternalLink aria-hidden className="size-4" />
                  {file.name}
                </a>
              </div>
            )}
            {!file && version.externalPreview && (
              <iframe
                src={version.externalPreview}
                title={text.openVideo}
                allow="autoplay; fullscreen"
                className={cn("block w-full bg-ink", formatAspect[format])}
              />
            )}
          </div>

          {files.length > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSlide((index) => Math.max(0, index - 1))}
                disabled={slide === 0}
                aria-label={shareText.gallery.previous}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <p className="text-sm text-ink/75" aria-live="polite">
                {text.slide(slide + 1, files.length)}
              </p>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSlide((index) => Math.min(files.length - 1, index + 1))}
                disabled={slide === files.length - 1}
                aria-label={shareText.gallery.next}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          )}
          {canPin && <p className="mt-3 text-center text-sm text-ink/65">{text.pinHint}</p>}
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-heading font-semibold">
              {workspaceText.content.versions.label(version.versionNo)}
            </p>
            <StatusBadge kind="design" status={version.status} />
          </div>
          <p className="mt-1 text-xs text-ink/65">{formatDate(version.createdAt)}</p>
          {version.note && (
            <p className="mt-3 text-sm whitespace-pre-line text-ink/85">{version.note}</p>
          )}
          {decided && version.decidedBy && (
            <p className="mt-3 text-sm text-ink/75">
              {workspaceText.content.versions.decided(
                version.status === "approved" ? text.decidedApproved : text.decidedRevision,
                version.decidedBy,
              )}
            </p>
          )}

          {showDecision &&
            isLatest &&
            !decided &&
            canComment &&
            actions.approve &&
            actions.revise && (
              <div className="mt-4 grid gap-2">
                <ConfirmDialog
                  tone="primary"
                  trigger={
                    <Button className="w-full">
                      <Check aria-hidden />
                      {text.approve}
                    </Button>
                  }
                  title={text.approveTitle}
                  description={text.approveDescription}
                  confirmLabel={text.approve}
                  onConfirm={run(() => actions.approve!(version.id), text.approved)}
                />
                {openComments.length > 0 ? (
                  <ConfirmDialog
                    tone="primary"
                    trigger={
                      <Button variant="outline" className="w-full">
                        <RotateCcw aria-hidden />
                        {text.requestRevision}
                      </Button>
                    }
                    title={text.revisionTitle}
                    description={text.revisionDescription(openComments.length)}
                    confirmLabel={text.requestRevision}
                    onConfirm={run(() => actions.revise!(version.id), text.revisionSent)}
                  />
                ) : (
                  <p className="rounded-lg bg-canvas px-3 py-2 text-sm text-ink/75">
                    {text.revisionNeedsComment}
                  </p>
                )}
              </div>
            )}
          {!canComment && <p className="mt-3 text-sm text-ink/70">{text.readOnly}</p>}
        </section>

        <section
          aria-labelledby="comments-heading"
          className="rounded-2xl border border-line bg-paper p-4"
        >
          <h2 id="comments-heading" className="font-heading text-base font-semibold">
            {adminText.title}
            {version.comments.length > 0 && (
              <span className="ml-1.5 font-normal text-ink/60">{version.comments.length}</span>
            )}
          </h2>
          {version.comments.length === 0 ? (
            <p className="mt-2 text-sm text-ink/65">{adminText.empty}</p>
          ) : (
            <ol className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
              {version.comments.map((comment) => {
                const number = pinNumbers.get(comment.id);
                return (
                  <li
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className={cn(
                      "rounded-xl border border-line p-3 text-sm transition-colors",
                      activeComment === comment.id && "border-primary bg-brand-soft/60",
                      comment.resolved && "opacity-65",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => focusComment(comment)}
                      className="block w-full text-left"
                    >
                      <span className="flex items-center gap-2">
                        {number ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-[11px] font-bold text-primary-foreground">
                            {number}
                          </span>
                        ) : (
                          <span className="text-xs text-ink/60">{adminText.general}</span>
                        )}
                        <span className="font-semibold text-ink">{comment.author}</span>
                        {comment.isTeam && (
                          <span className="rounded-sm bg-sand px-1.5 text-[11px] font-semibold">
                            Tim
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block whitespace-pre-line text-ink/85">
                        {comment.body}
                      </span>
                    </button>
                    <span className="mt-2 flex items-center justify-between gap-2 text-xs text-ink/60">
                      <span>{formatDate(comment.createdAt)}</span>
                      {actions.resolve ? (
                        <button
                          type="button"
                          onClick={() =>
                            startTransition(
                              run(
                                () => actions.resolve!(comment.id, !comment.resolved),
                                comment.resolved
                                  ? "Komentar dibuka lagi."
                                  : "Komentar ditandai selesai.",
                              ),
                            )
                          }
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          {comment.resolved ? adminText.reopen : adminText.resolve}
                        </button>
                      ) : (
                        comment.resolved && (
                          <span className="font-semibold">{adminText.resolved}</span>
                        )
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {canComment && isLatest && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitComment();
              }}
              className="mt-4 grid gap-2 border-t border-line pt-4"
            >
              <label htmlFor="review-comment" className="text-sm font-semibold">
                {point ? text.pinComment(nextPin) : text.commentLabel}
              </label>
              {point && (
                <span className="flex items-center gap-2 text-xs text-ink/70">
                  <MapPin aria-hidden className="size-3.5 text-primary" />
                  {adminText.pin(nextPin)}
                  <button
                    type="button"
                    onClick={() => setPoint(null)}
                    className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
                  >
                    <X aria-hidden className="size-3" />
                    {text.cancelPin}
                  </button>
                </span>
              )}
              <Textarea
                id="review-comment"
                rows={3}
                value={body}
                placeholder={text.commentPlaceholder}
                onChange={(event) => setBody(event.target.value)}
              />
              <Button type="submit" disabled={pending || !body.trim()} className="w-full">
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                {text.addComment}
              </Button>
            </form>
          )}
        </section>
      </aside>
    </div>
  );
}
