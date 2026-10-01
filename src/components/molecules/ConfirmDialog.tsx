"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConfirmDialogProps = {
  /** Tombol pemicu (dirender dengan asChild). Kosongkan jika dibuka dari luar (`open`). */
  trigger?: ReactNode;
  /** Mode terkendali, mis. dibuka dari item menu dropdown. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  /** Jelaskan akibatnya, bukan sekadar "Apakah kamu yakin?". */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** Isian tambahan di dalam dialog, mis. tanggal pembayaran. */
  children?: ReactNode;
  /** Dialog tertutup setelah janji ini selesai; toast dikirim oleh pemanggil. */
  onConfirm: () => Promise<void> | void;
};

/** Konfirmasi hanya untuk aksi yang tidak bisa dibatalkan (hapus, kirim, batalkan). */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "danger",
  children,
  onConfirm,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="text-ink/75">{description}</DialogDescription>
        {children}
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            onClick={confirm}
            disabled={pending}
            className={cn(tone === "danger" && "bg-danger text-white hover:bg-danger/90")}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
