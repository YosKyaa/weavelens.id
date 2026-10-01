"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Copy, Link2, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createBrandLinks,
  createShareLink,
  revokeShareLink,
} from "@/app/(portal)/admin/projects/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Field, selectClass } from "@/components/molecules/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { workspaceText } from "@/content/workspace";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const text = workspaceText.share;

export type ShareLinkRow = {
  id: string;
  token: string;
  label: string;
  brandName: string | null;
  canReview: boolean;
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  lastOpenedAt: string | null;
};

function shareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

async function copy(token: string, message = text.copied) {
  try {
    await navigator.clipboard.writeText(shareUrl(token));
    toast.success(message);
  } catch {
    toast.error("Browser menolak menyalin. Salin manual dari kolom link.");
  }
}

type ShareLinksManagerProps = {
  projectId: string;
  projectTitle: string;
  brands: { id: string; name: string }[];
  links: ShareLinkRow[];
  /** Jumlah brand yang belum punya link aktif. */
  missingBrands: number;
};

/** Buat, salin, kirim, dan cabut link akses klien. */
export function ShareLinksManager({
  projectId,
  projectTitle,
  brands,
  links,
  missingBrands,
}: ShareLinksManagerProps) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [brandId, setBrandId] = useState("");
  const [canReview, setCanReview] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createShareLink(projectId, {
        label,
        brandId: brandId || null,
        canReview,
        expiresAt,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setLabel("");
      await copy(result.token, text.created);
      router.refresh();
    });
  }

  function createForAllBrands() {
    startTransition(async () => {
      const result = await createBrandLinks(projectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.created ? `${result.created} link brand dibuat.` : "Semua brand sudah punya link.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {missingBrands > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-brand-soft/50 p-4">
          <p className="text-sm text-ink">
            {missingBrands} brand belum punya link klien. Buat sekaligus satu link per brand (boleh
            review), lalu kirim ke PIC masing-masing.
          </p>
          <Button onClick={createForAllBrands} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            Buat link per brand
          </Button>
        </div>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
        className="grid gap-4 rounded-2xl border border-line bg-paper p-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="share-label" label={text.label} required error={error}>
            <Input
              id="share-label"
              value={label}
              placeholder={text.labelPlaceholder}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          {brands.length > 0 && (
            <Field id="share-scope" label={text.scope}>
              <select
                id="share-scope"
                value={brandId}
                onChange={(event) => setBrandId(event.target.value)}
                className={selectClass}
              >
                <option value="">{text.scopeAll}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    Hanya {brand.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field id="share-expires" label={text.expires}>
            <Input
              id="share-expires"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Field>
          <label className="flex items-center gap-3 self-end pb-2 text-sm font-medium">
            <Switch checked={canReview} onCheckedChange={setCanReview} />
            {text.canReview}
          </label>
        </div>
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Link2 aria-hidden />}
          {text.create}
        </Button>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-ink/70">{text.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {links.map((link) => {
            const active = link.status === "active";
            return (
              <li
                key={link.id}
                className={cn(
                  "grid gap-3 rounded-2xl border border-line bg-paper p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center",
                  !active && "opacity-60",
                )}
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{link.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        active ? "bg-success-soft text-success" : "bg-placeholder text-ink/75",
                      )}
                    >
                      {text.status[link.status]}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink/70">
                    {[
                      link.brandName ? `Hanya ${link.brandName}` : text.scopeAll,
                      link.canReview ? null : text.viewOnly,
                      link.expiresAt ? `Berlaku sampai ${formatDate(link.expiresAt)}` : null,
                      link.lastOpenedAt
                        ? text.lastOpened(formatDate(link.lastOpenedAt))
                        : text.neverOpened,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {active && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(link.token)}>
                      <Copy aria-hidden />
                      {text.copy}
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href="https://wa.me/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => {
                          // URL lengkap baru bisa dibuat di browser (butuh origin).
                          event.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(
                            text.waMessage(projectTitle, shareUrl(link.token)),
                          )}`;
                        }}
                      >
                        <MessageCircle aria-hidden />
                        {text.whatsapp}
                      </a>
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-soft hover:text-danger"
                        >
                          <Ban aria-hidden />
                          {text.revoke}
                        </Button>
                      }
                      title={text.revokeTitle}
                      description={text.revokeDescription}
                      confirmLabel={text.revoke}
                      onConfirm={async () => {
                        const result = await revokeShareLink(projectId, link.id);
                        if (!result.ok) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success(text.revoked);
                        router.refresh();
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
