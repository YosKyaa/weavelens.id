"use client";

import { useOptimistic, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteItem, moveItem, setVisible } from "@/app/(portal)/admin/konten/actions";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CMS_BASE } from "@/lib/cms/collections";

type AdminRowActionsProps = {
  slug: string;
  id: string;
  title: string;
  visible: boolean;
  isFirst: boolean;
  isLast: boolean;
};

/** Aksi per baris: tampil/sembunyi, urutkan, edit, hapus (dengan konfirmasi). */
export function AdminRowActions({
  slug,
  id,
  title,
  visible,
  isFirst,
  isLast,
}: AdminRowActionsProps) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(visible);

  function toggle(next: boolean) {
    startTransition(async () => {
      setShown(next);
      await setVisible(slug, id, next);
      toast.success(next ? `“${title}” ditampilkan.` : `“${title}” disembunyikan dari website.`);
    });
  }

  function move(direction: -1 | 1) {
    startTransition(() => moveItem(slug, id, direction));
  }

  return (
    <div className="flex items-center gap-1 md:justify-end">
      <label className="mr-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Switch
          checked={shown}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label={`Tampilkan “${title}” di website`}
        />
        <span className="w-16">{shown ? "Tampil" : "Sembunyi"}</span>
      </label>
      <Button
        variant="ghost"
        size="icon"
        disabled={isFirst || pending}
        onClick={() => move(-1)}
        aria-label={`Naikkan “${title}”`}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        disabled={isLast || pending}
        onClick={() => move(1)}
        aria-label={`Turunkan “${title}”`}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowDown aria-hidden />}
      </Button>
      <Button asChild variant="ghost" size="icon" aria-label={`Edit “${title}”`}>
        <Link href={`${CMS_BASE}/${slug}/${encodeURIComponent(id)}`}>
          <Pencil aria-hidden />
        </Link>
      </Button>
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            aria-label={`Hapus “${title}”`}
          >
            <Trash2 aria-hidden />
          </Button>
        }
        title={`Hapus “${title}”?`}
        description="Item ini langsung hilang dari website dan tidak bisa dikembalikan. Kalau hanya ingin menyembunyikan sementara, matikan saklar “Tampil”."
        confirmLabel="Ya, hapus"
        onConfirm={() => deleteItem(slug, id)}
      />
    </div>
  );
}
